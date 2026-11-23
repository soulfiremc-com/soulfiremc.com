import { Popover as BasePopover } from "@base-ui/react/popover";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "fumadocs-ui/components/ui/popover";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import type {
  LanguageSelectProps,
  LanguageSelectTextProps,
} from "fumadocs-ui/layouts/shared/slots/language-select";
import { useT } from "@/lib/i18n-react";
import { cn } from "@/lib/utils";

// Replaces the Fumadocs language switcher, which leaves its popover unnamed
// and renders each language name without a lang attribute, so screen readers
// read "Deutsch" or "Русский" with the page language's voice.
export function LanguageSelect({
  className,
  variant = "ghost",
  children,
  ...rest
}: LanguageSelectProps) {
  const t = useT();
  const { locale, locales = [], onChange } = useI18n();
  const label = t("docs.chooseALanguage");
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className={(state) =>
          cn(
            buttonVariants({ variant }),
            "gap-1.5 p-1.5",
            state.open && "bg-fd-accent",
            className,
          )
        }
        {...rest}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-0.5 p-1">
        <BasePopover.Title className="p-2 text-xs font-medium text-fd-muted-foreground">
          {label}
        </BasePopover.Title>
        {locales.map((item) => (
          <PopoverClose
            key={item.locale}
            lang={item.locale}
            aria-current={item.locale === locale ? "true" : undefined}
            className={cn(
              "rounded-lg px-2 py-1.5 text-start text-sm transition-colors",
              item.locale === locale
                ? "bg-fd-primary/10 text-fd-primary"
                : "text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground",
            )}
            onClick={() => onChange?.(item.locale)}
          >
            {item.name}
          </PopoverClose>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function LanguageSelectText(props: LanguageSelectTextProps) {
  const { locale, locales } = useI18n();
  const name = locales?.find((item) => item.locale === locale)?.name;
  return (
    <span lang={locale} {...props}>
      {name}
    </span>
  );
}
