import codeHtml from "@/components/sdk-code-html.generated.json";

export function SdkCode({ language }: { language: "typescript" | "python" }) {
  return (
    <div
      className="p-5 font-mono text-xs leading-6 sm:p-6 sm:text-sm [&_.shiki]:overflow-x-auto [&_.shiki]:bg-transparent [&_.shiki]:[--padding-left:0px] [&_.shiki]:[--padding-right:0px]"
      dangerouslySetInnerHTML={{ __html: codeHtml[language] }}
    />
  );
}
