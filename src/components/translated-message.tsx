import type { MessageKey } from "@/lib/messages";
import { Fragment, type ReactNode } from "react";
import { useT } from "@/lib/i18n-react";

export function TranslatedMessage({
  text,
  values,
}: {
  text: MessageKey;
  values: Record<string, ReactNode>;
}) {
  const t = useT();
  return t(text)
    .split(/(\{\w+\})/)
    .map((part) =>
      part.startsWith("{") && part.endsWith("}") ? (
        <Fragment key={part}>{values[part.slice(1, -1)] ?? part}</Fragment>
      ) : (
        part
      ),
    );
}
