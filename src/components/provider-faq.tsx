import { Link } from "@tanstack/react-router";
import { TranslatedMessage } from "@/components/translated-message";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLocale, useT } from "@/lib/i18n-react";
import { providerFaqs, type ProviderKind } from "@/lib/provider-faq-data";

export function ProviderFaq({ kind }: { kind: ProviderKind }) {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">{t("faq.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(
            kind === "accounts"
              ? "faq.commonQuestionsAboutMinecraftAccounts"
              : "faq.commonQuestionsAboutProxiesForSoulfire",
          )}
        </p>
      </div>
      <Accordion className="w-full">
        {providerFaqs[kind].map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger>{t(item.question)}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              <TranslatedMessage
                text={item.answer}
                values={{
                  guide:
                    "guide" in item ? (
                      <Link
                        to="/{-$lang}/docs/$"
                        params={{
                          lang: locale === "en" ? undefined : locale,
                          _splat: `how-to/import-${kind}`,
                        }}
                        className="text-primary underline"
                      >
                        {t(item.guide)}
                      </Link>
                    ) : null,
                }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
