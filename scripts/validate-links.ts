import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import GithubSlugger from "github-slugger";
import {
  type FileObject,
  printErrors,
  scanURLs,
  validateFiles,
} from "next-validate-link";
import { remark } from "remark";
import remarkMdx from "remark-mdx";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const DOCS_DIR = path.join(process.cwd(), "content", "docs");
const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const REDIRECT_URLS = ["/demo-video", "/discord", "/donate", "/github"];

type AstNode = {
  alt?: string;
  children?: AstNode[];
  type?: string;
  value?: string;
};

type RouteFile = FileObject & {
  hashes: string[];
  populateKey: "blog/[slug]" | "docs/[[..._splat]]";
  routeValue: Record<string, string | string[]>;
};

async function checkLinks() {
  const files = await getFiles();
  const publicUrls = await getPublicUrls();

  const scanned = await scanURLs({
    preset: "tanstack-start",
    populate: {
      "docs/[[..._splat]]": files
        .filter((file) => file.populateKey === "docs/[[..._splat]]")
        .map((file) => ({
          value: { _splat: file.routeValue.slug },
          hashes: file.hashes,
        })),
      "blog/[slug]": files
        .filter((file) => file.populateKey === "blog/[slug]")
        .map((file) => ({
          value: file.routeValue,
          hashes: file.hashes,
        })),
    },
  });

  for (const url of [...publicUrls, ...REDIRECT_URLS]) {
    scanned.urls.set(url, {});
  }

  printErrors(
    await validateFiles(files, {
      scanned,
      markdown: {
        components: {
          Card: { attributes: ["href"] },
        },
      },
      checkRelativePaths: "as-url",
    }),
    true,
  );
}

async function getFiles(): Promise<RouteFile[]> {
  const [docsFiles, blogFiles] = await Promise.all([
    getDocsFiles(),
    getBlogFiles(),
  ]);

  return [...docsFiles, ...blogFiles];
}

async function getPublicUrls(): Promise<string[]> {
  const files = await walkFiles(PUBLIC_DIR);

  return files.map(
    (filePath) => `/${toPosixPath(path.relative(PUBLIC_DIR, filePath))}`,
  );
}

async function getDocsFiles(): Promise<RouteFile[]> {
  const files = await walkMdxFiles(DOCS_DIR);

  return Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      const slugs = getDocsSlugs(filePath);

      return {
        path: filePath,
        content,
        url: toDocsUrl(slugs),
        hashes: getHeadings(content),
        populateKey: "docs/[[..._splat]]",
        routeValue: { slug: slugs },
      } satisfies RouteFile;
    }),
  );
}

async function getBlogFiles(): Promise<RouteFile[]> {
  const files = await walkMdxFiles(BLOG_DIR);

  return Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      const slug = getBlogSlug(filePath);

      return {
        path: filePath,
        content,
        url: `/blog/${slug}`,
        hashes: getHeadings(content),
        populateKey: "blog/[slug]",
        routeValue: { slug },
      } satisfies RouteFile;
    }),
  );
}

function getHeadings(content: string): string[] {
  const tree = remark().use(remarkMdx).parse(content);
  const slugger = new GithubSlugger();
  const headings: string[] = [];

  walk(tree as AstNode, (node) => {
    if (node.type !== "heading") {
      return;
    }

    const text = getNodeText(node).trim();
    if (text.length === 0) {
      return;
    }

    headings.push(slugger.slug(text));
  });

  return headings;
}

function getNodeText(node: AstNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }

  if (typeof node.alt === "string") {
    return node.alt;
  }

  if (!Array.isArray(node.children)) {
    return "";
  }

  return node.children.map((child) => getNodeText(child)).join("");
}

function walk(node: AstNode, visit: (node: AstNode) => void) {
  visit(node);

  if (!Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    walk(child, visit);
  }
}

function getDocsSlugs(filePath: string): string[] {
  const relative = toPosixPath(path.relative(DOCS_DIR, filePath));
  const withoutExtension = relative.replace(/\.mdx$/, "");
  const segments = withoutExtension
    .split("/")
    .filter((segment) => segment.length > 0)
    .filter((segment) => !/^\(.+\)$/.test(segment));

  if (segments.at(-1) === "index") {
    segments.pop();
  }

  return segments;
}

function getBlogSlug(filePath: string): string {
  return toPosixPath(path.relative(BLOG_DIR, filePath)).replace(/\.mdx$/, "");
}

function toDocsUrl(slugs: string[]): string {
  return slugs.length === 0 ? "/docs" : `/docs/${slugs.join("/")}`;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

async function walkMdxFiles(dir: string): Promise<string[]> {
  return walkFiles(dir, (filePath) => filePath.endsWith(".mdx"));
}

async function walkFiles(
  dir: string,
  predicate: (filePath: string) => boolean = () => true,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return walkFiles(fullPath, predicate);
      }

      if (entry.isFile() && predicate(fullPath)) {
        return [fullPath];
      }

      return [];
    }),
  );

  return nested.flat().sort();
}

void checkLinks();
