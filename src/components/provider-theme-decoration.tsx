export type ProviderThemeDecorationName = "localts" | "fernan" | "alts-fast";

export function ProviderThemeDecoration({
  theme,
}: {
  theme?: ProviderThemeDecorationName;
}) {
  if (!theme) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {theme === "localts" ? (
        <div className="absolute top-3 -right-4 flex -rotate-[24deg] flex-col gap-2">
          <div className="h-3 w-32 bg-localts-blue/10 dark:bg-localts-sky/10" />
          <div className="ml-6 h-2 w-32 bg-localts-sky/20 dark:bg-localts-blue/15" />
        </div>
      ) : null}
      {theme === "fernan" ? (
        <div className="absolute top-2 right-2 flex size-8 flex-col items-end gap-1.5 pt-1">
          <div className="h-[3px] w-7 bg-amber-400/70 dark:bg-amber-300/60" />
          <div className="h-[3px] w-4 bg-red-500/60 dark:bg-red-400/55" />
        </div>
      ) : null}
      {theme === "alts-fast" ? (
        <div className="absolute top-2 right-2 size-8 text-cyan-500/55 dark:text-cyan-300/45">
          <div className="absolute right-1 bottom-0 size-2 bg-current" />
          <div className="absolute right-0 bottom-3 size-1.5 bg-current" />
          <div className="absolute right-2 bottom-6 size-1 bg-current" />
        </div>
      ) : null}
    </div>
  );
}
