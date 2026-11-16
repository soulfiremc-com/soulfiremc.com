import { replaceSdkReleaseTokens } from "../sdk-release";

type Node = {
  type: string;
  value?: unknown;
  url?: unknown;
  meta?: unknown;
  attributes?: Array<{ value?: unknown }>;
  children?: Node[];
};

function replace(node: Node) {
  if (typeof node.value === "string")
    node.value = replaceSdkReleaseTokens(node.value);
  if (typeof node.url === "string")
    node.url = replaceSdkReleaseTokens(node.url);
  if (typeof node.meta === "string")
    node.meta = replaceSdkReleaseTokens(node.meta);
  for (const attribute of node.attributes ?? [])
    if (typeof attribute.value === "string")
      attribute.value = replaceSdkReleaseTokens(attribute.value);
  node.children?.forEach(replace);
}

/**
 * Fill `%SOULFIRE_SDK_VERSION%` and related placeholders in docs with the
 * release from `sdk-release.json`, so prose, install commands, and code
 * samples always name the same release.
 */
export function remarkSdkRelease() {
  return (tree: Node) => replace(tree);
}
