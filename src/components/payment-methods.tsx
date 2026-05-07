import {
  SiAlipay,
  SiAmericanexpress,
  SiApplepay,
  SiBinance,
  SiBitcoin,
  SiCashapp,
  SiDiscord,
  SiGooglepay,
  SiKlarna,
  SiLitecoin,
  SiMastercard,
  SiPayoneer,
  SiPaypal,
  SiPaysafe,
  SiVisa,
} from "@icons-pack/react-simple-icons";
import {
  CircleDollarSign,
  CreditCard,
  Landmark,
  Link as LinkIcon,
  WalletCards,
} from "lucide-react";
import type { ElementType } from "react";

type PaymentLogoConfig =
  | {
      Icon: ElementType;
      mark?: never;
    }
  | {
      Icon?: never;
      mark: string;
    };

const paymentLogos: Record<string, PaymentLogoConfig> = {
  alipay: { Icon: SiAlipay },
  amazonpay: { mark: "a" },
  amex: { Icon: SiAmericanexpress },
  applepay: { Icon: SiApplepay },
  banktransfer: { Icon: Landmark },
  bankwire: { Icon: Landmark },
  bancontact: { mark: "BC" },
  binancegiftcardpaypalskrill: { Icon: SiBinance },
  blik: { mark: "B" },
  bitcoin: { Icon: SiBitcoin },
  btc: { Icon: SiBitcoin },
  card: { Icon: CreditCard },
  cashapp: { Icon: SiCashapp },
  checkoutvaries: { Icon: WalletCards },
  creditcard: { Icon: CreditCard },
  crypto: { Icon: SiBitcoin },
  discordcheckout: { Icon: SiDiscord },
  eps: { mark: "eps" },
  googlepay: { Icon: SiGooglepay },
  klarna: { Icon: SiKlarna },
  link: { Icon: LinkIcon },
  litecoin: { Icon: SiLitecoin },
  localmethods: { Icon: WalletCards },
  ltc: { Icon: SiLitecoin },
  mastercard: { Icon: SiMastercard },
  paypal: { Icon: SiPaypal },
  payoneer: { Icon: SiPayoneer },
  paysafecard: { Icon: SiPaysafe },
  skrill: { mark: "S" },
  visa: { Icon: SiVisa },
  wallet: { Icon: WalletCards },
  websitecheckout: { Icon: WalletCards },
  wiretransfer: { Icon: Landmark },
};

function normalizePaymentMethod(method: string) {
  return method.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function getPaymentLogo(method: string): PaymentLogoConfig {
  const normalizedMethod = normalizePaymentMethod(method);

  if (normalizedMethod.includes("binance")) {
    return { Icon: SiBinance };
  }

  if (normalizedMethod.includes("paypal")) {
    return { Icon: SiPaypal };
  }

  if (normalizedMethod.includes("paysafe")) {
    return { Icon: SiPaysafe };
  }

  return (
    paymentLogos[normalizedMethod] ??
    (normalizedMethod.includes("bank")
      ? { Icon: Landmark }
      : { Icon: CircleDollarSign })
  );
}

function PaymentMethodLogo({ method }: { method: string }) {
  const logo = getPaymentLogo(method);

  if (logo.mark) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-[3px] border bg-muted px-0.5 text-[8px] font-bold leading-none text-foreground"
      >
        {logo.mark}
      </span>
    );
  }

  const Icon = logo.Icon;

  if (!Icon) {
    return null;
  }

  return (
    <Icon
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
      focusable="false"
      title=""
    />
  );
}

export function PaymentMethods({ methods }: { methods?: string[] }) {
  if (!methods?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <CreditCard className="h-3.5 w-3.5" />
        Payments
      </span>
      {methods.map((method) => (
        <span
          key={method}
          className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5"
        >
          <PaymentMethodLogo method={method} />
          {method}
        </span>
      ))}
    </div>
  );
}
