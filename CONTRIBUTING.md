# Contributing documentation

Write for a reader with a task to complete. Start with the result, state the
prerequisites, and show how the reader can check that the task worked.

## Choose the right page

- **Get started:** guided tutorials with a small, repeatable result.
- **Use SoulFire, testing, automation, scripting, and server guides:** procedures
  for a specific task. Link to prerequisites instead of repeating installation.
- **Reference:** exact names, formats, defaults, methods, and schemas.
- **Concepts:** explain behavior and tradeoffs without turning into a procedure.

Each MDX page needs a `title` and `description` in its front matter. Fumadocs
renders the title as the page heading, so start the body headings at `##`.
Use short paragraphs, active voice, descriptive links, and fenced code blocks
with a language. Give complete programs a filename with `title="example.ts"`.
Use callouts for context that changes the reader's next action.

Use `sidebarTitle` for a short navigation label when the page title is longer.
Keep labels specific enough to identify a page within its section.
Each section uses its index page as the clickable collapsible heading. Leave that
page out of `pages` in `meta.json`, or set `pagesIndex` for a named overview.
Listing the overview in `pages` creates a separate child row instead.
Use folders in parentheses to group topics without changing their URLs.

Add child pages to their section's `meta.json`. When moving a page, preserve its old URL
in `src/lib/docs/redirects.ts` and update internal links to the new destination.
Do not remove a published URL just to make the sidebar simpler.

## Check facts against the implementation

The source revision in `scripts/sdk-source.ts` defines the SDK and built-in node
reference. Keep the SDK baseline aligned with a published release. Verify npm
and PyPI versions. Update the public installation guide in
`content/docs/(main)/(automation)/sdk/(start)/compatibility.mdx` when changing the
baseline. Check the backend handshake and required plugins, too.

For GUI procedures, inspect the matching SoulFireClient source or a running
client. Record the version when adding screenshots. For commands and settings,
check the backend declaration and the connected server's help or metadata.
Do not infer defaults from examples or turn a measured capacity into a universal
hardware recommendation.

Keep operational examples explicit about ports, storage paths, token audience,
working directories, and cleanup. Tutorials must include an expected result and
a stop procedure. SDK beginner examples use managed setup with the `DocsBot_1`
account and a Minecraft server at `localhost:25565`. Keep manual account discovery
for existing-backend guides.

## Regenerate references

Install Bun, Git, Python 3.14, and Java 25, then run:

```bash
bun run generate-node-reference
bun run generate-sdk-reference
```

The node generator reads the registry and Java metadata. The SDK generator reads
TypeScript exports and Python exports, signatures, and docstrings. Generated pages
link to their source. Change the source or generator when a reference is wrong.

The homepage programs live in `src/lib/sdk-code-examples.ts`. After editing them,
run `bun run generate-sdk-code` to refresh their highlighted HTML.

## Validate executable examples

Mark complete SDK code blocks with `doc-test` and a filename:

````md
```ts title="example.ts" doc-test
// A complete program, including imports.
```
````

`check-sdk-recipes` checks every marked SDK block and both homepage programs
against the pinned SDK. It uses strict TypeScript and Python type checks, then
compiles the Python files. Each SDK recipe must contain one complete program
for each language. Keep focused API fragments unmarked and label them as fragments.

`check-plugin-examples` compiles marked Java examples in the first-plugin and
bot-control guides against the real backend classes. Bot-control fragments run
inside a method with a `BotConnection connection` parameter supplied by the checker.
These checks catch API drift; they do not start a Minecraft session.

Downloadable script graphs belong in `public/docs/scripts`. The script checker
checks their export shape, node IDs, ports, inline values, required inputs, and
execution edges against the generated node catalog. Its scope is the small,
acyclic documentation recipes. Import and run changed graphs on the matching
backend to verify their behavior before claiming runtime validation.

## Verify the result

```bash
bun run check
bun run check-docs
bun run typecheck
bun run test
bun run build
```

`check-docs` validates internal links and redirects, rejects stale generated
references, and checks SDK, script, and native plugin examples. CI runs these
checks. The first run needs network access to fetch the pinned source and build
dependencies. You can reuse a matching checkout through `SOULFIRE_SDK_SOURCE`.

Preview changed pages with `bun dev`. Check the sidebar, code tabs, downloads,
tables, images, search, and old URLs at desktop and mobile widths. Read the
procedure in order and follow it on a local test server. Record any runtime
checks that you could not perform.
