"use client";

import { useLocale } from "@/lib/i18n-react";
import buildFormatter from "react-timeago/lib/formatters/buildFormatter";
import de from "react-timeago/lib/language-strings/de";
import pl from "react-timeago/lib/language-strings/pl";
import ru from "react-timeago/lib/language-strings/ru";
const formatters = {
  de: buildFormatter(de),
  pl: buildFormatter(pl),
  ru: buildFormatter(ru),
};

import { useEffect, useState } from "react";
import TimeAgo, { type Props } from "react-timeago";

function toDate(value: Props["date"]): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function CustomTimeAgo(props: Props) {
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    const date = toDate(props.date);
    if (!date) {
      return null;
    }

    return (
      <time dateTime={date.toISOString()}>
        {new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(date)}
      </time>
    );
  }

  return (
    <TimeAgo
      {...props}
      formatter={locale === "en" ? undefined : formatters[locale]}
    />
  );
}
