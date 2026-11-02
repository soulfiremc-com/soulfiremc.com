"use client";

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
        {new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(date)}
      </time>
    );
  }

  return <TimeAgo {...props} />;
}
