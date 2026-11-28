import type { MessageKey } from "@/lib/messages";
import { useT } from "@/lib/i18n-react";
import { SiDiscord, SiTelegram } from "@icons-pack/react-simple-icons";
import { Link } from "@tanstack/react-router";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { Check, Copy, ExternalLink, Mail, Store } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaBody,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { ProviderKind } from "@/lib/provider-faq-data";

const DISCORD_USERNAME = "pistonmaster";
const CONTACT_EMAIL = "contact@soulfiremc.com";
const TELEGRAM_USERNAME = "pistondev";

const LISTING_COPY = {
  accounts: {
    button: "providers.listing.accounts.button",
    title: "providers.listing.accounts.title",
    requirements: [
      "providers.listing.accounts.requirements.name",
      "providers.listing.accounts.requirements.url",
      "providers.listing.accounts.requirements.category",
      "providers.listing.accounts.requirements.price",
      "providers.listing.accounts.requirements.features",
      "providers.listing.accounts.requirements.links",
    ],
  },
  proxies: {
    button: "providers.listing.proxies.button",
    title: "providers.listing.proxies.title",
    requirements: [
      "providers.listing.proxies.requirements.name",
      "providers.listing.proxies.requirements.url",
      "providers.listing.proxies.requirements.types",
      "providers.listing.proxies.requirements.price",
      "providers.listing.proxies.requirements.features",
      "providers.listing.proxies.requirements.links",
    ],
  },
} satisfies Record<
  ProviderKind,
  { button: MessageKey; title: MessageKey; requirements: MessageKey[] }
>;

function CopyValueButton({ value, label }: { value: string; label: string }) {
  const t = useT();
  const [copied, handleCopy] = useCopyButton(() =>
    navigator.clipboard.writeText(value),
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        aria-label={label}
      >
        {copied ? <Check className="text-success" /> : <Copy />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? t("providers.listing.copied") : ""}
      </span>
    </>
  );
}

function ContactItem({
  icon,
  title,
  value,
  copyLabel,
  action,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  copyLabel: string;
  action: ReactNode;
}) {
  return (
    <Item variant="outline" size="sm">
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>
          <span className="font-mono">{value}</span>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <CopyValueButton value={value} label={copyLabel} />
        {action}
      </ItemActions>
    </Item>
  );
}

export function ListYourShopCredenza({ kind }: { kind: ProviderKind }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const copy = LISTING_COPY[kind];

  return (
    <>
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          <Store data-icon="inline-start" />
          {t(copy.button)}
        </Button>
      </div>
      <Credenza open={open} onOpenChange={setOpen}>
        <CredenzaContent className="sm:max-w-lg" closeLabel={t("common.close")}>
          <CredenzaHeader>
            <CredenzaTitle>{t(copy.title)}</CredenzaTitle>
            <CredenzaDescription>
              {t("providers.listing.description")}
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <ContactItem
                  icon={<SiDiscord />}
                  title={t("providers.listing.discord.title")}
                  value={`@${DISCORD_USERNAME}`}
                  copyLabel={t("providers.listing.discord.copy")}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link to="/discord" target="_blank" rel="noopener">
                          {t("providers.listing.discord.join")}
                          <ExternalLink data-icon="inline-end" />
                        </Link>
                      }
                    />
                  }
                />
                <ContactItem
                  icon={<SiTelegram />}
                  title={t("providers.listing.telegram.title")}
                  value={`@${TELEGRAM_USERNAME}`}
                  copyLabel={t("providers.listing.telegram.copy")}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a
                          href={`https://t.me/${TELEGRAM_USERNAME}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("providers.listing.telegram.open")}
                          <ExternalLink data-icon="inline-end" />
                        </a>
                      }
                    />
                  }
                />
                <ContactItem
                  icon={<Mail />}
                  title={t("providers.listing.email.title")}
                  value={CONTACT_EMAIL}
                  copyLabel={t("providers.listing.email.copy")}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a href={`mailto:${CONTACT_EMAIL}`}>
                          {t("providers.listing.email.send")}
                        </a>
                      }
                    />
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">
                  {t("providers.listing.include")}
                </h3>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                  {copy.requirements.map((requirement) => (
                    <li key={requirement}>{t(requirement)}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("providers.listing.badges")}
              </p>
            </div>
          </CredenzaBody>
          <CredenzaFooter>
            <CredenzaClose
              render={
                <Button type="button" variant="outline">
                  {t("common.close")}
                </Button>
              }
            />
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </>
  );
}
