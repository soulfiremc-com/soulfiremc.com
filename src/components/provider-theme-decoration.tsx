export type ProviderThemeDecorationName =
  | "rave"
  | "fernan"
  | "alts-fast"
  | "legionproxy"
  | "proxy-seller";

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
      {theme === "rave" ? (
        <>
          <div className="absolute -right-10 -top-10 size-28 rounded-full bg-rose-500/18 blur-3xl dark:bg-rose-400/18" />
          <div className="absolute -bottom-8 left-0 size-24 rounded-full bg-orange-400/18 blur-2xl dark:bg-orange-300/12" />
        </>
      ) : null}
      {theme === "fernan" ? (
        <div className="absolute right-2 top-2 flex size-8 flex-col items-end gap-1.5 pt-1">
          <div className="h-[3px] w-7 bg-amber-400/70 dark:bg-amber-300/60" />
          <div className="h-[3px] w-4 bg-red-500/60 dark:bg-red-400/55" />
        </div>
      ) : null}
      {theme === "alts-fast" ? (
        <div className="absolute right-2 top-2 size-8 text-cyan-500/55 dark:text-cyan-300/45">
          <div className="absolute bottom-0 right-1 size-2 bg-current" />
          <div className="absolute bottom-3 right-0 size-1.5 bg-current" />
          <div className="absolute bottom-6 right-2 size-1 bg-current" />
        </div>
      ) : null}
      {theme === "legionproxy" ? (
        <div className="absolute right-2 top-2 size-8">
          <div className="absolute left-1 top-1 h-2 w-6 bg-lime-500/55 dark:bg-lime-300/45" />
          <div className="absolute left-1 top-1 h-6 w-2 bg-lime-500/55 dark:bg-lime-300/45" />
          <div className="absolute bottom-1 right-1 h-2 w-4 bg-zinc-600/35 dark:bg-zinc-300/30" />
          <div className="absolute bottom-1 right-1 h-4 w-2 bg-zinc-600/35 dark:bg-zinc-300/30" />
        </div>
      ) : null}
      {theme === "proxy-seller" ? (
        <div className="absolute right-2 top-2 size-8 text-emerald-500/55 dark:text-emerald-300/45">
          <div className="absolute right-1 top-1 size-4 border-r-[3px] border-t-[3px] border-current" />
          <div className="absolute bottom-1 left-1 size-4 border-b-[3px] border-l-[3px] border-current" />
        </div>
      ) : null}
    </div>
  );
}
