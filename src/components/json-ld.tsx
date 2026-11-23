import type { Thing, WithContext } from "schema-dts";
import { escapeScriptJson } from "@/lib/seo";

/** Renders serialized JSON-LD. The JSON must already be a string. */
export function JsonLdScript({ json }: { json: string }) {
  return (
    <script
      type="application/ld+json"
      // oxlint-disable-next-line react/no-danger -- JSON-LD must be the raw text of the script element
      dangerouslySetInnerHTML={{ __html: escapeScriptJson(json) }}
    />
  );
}

export function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
  return <JsonLdScript json={JSON.stringify(data)} />;
}
