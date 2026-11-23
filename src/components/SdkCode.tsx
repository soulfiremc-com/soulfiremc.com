import codeHtml from "@/components/sdk-code-html.generated.json";

// Phones wrap long lines instead of scrolling sideways. The hanging indent is
// deeper than any indent in the examples, so a wrapped part always reads as a
// continuation of the line above.
export function SdkCode({ language }: { language: "typescript" | "python" }) {
  return (
    <div
      className="p-4 font-mono text-xs/6 sm:p-6 sm:text-sm max-sm:[&_.line]:inline-block max-sm:[&_.line]:w-full max-sm:[&_.line]:-indent-18 max-sm:[&_.line]:[--padding-left:--spacing(18)] max-sm:[&_.line]:[--padding-right:0px] [&_.shiki]:overflow-x-auto [&_.shiki]:bg-transparent [&_.shiki]:[--padding-left:0px] [&_.shiki]:[--padding-right:0px] max-sm:[&_.shiki]:wrap-break-word max-sm:[&_.shiki]:whitespace-pre-wrap"
      // oxlint-disable-next-line react/no-danger -- the code HTML comes from Shiki at build time
      dangerouslySetInnerHTML={{ __html: codeHtml[language] }}
    />
  );
}
