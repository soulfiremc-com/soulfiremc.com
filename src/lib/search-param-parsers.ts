import { z } from "zod";

function splitDelimitedValue(value: string, separator: string) {
  return value.split(separator).filter(Boolean);
}

export function searchStringArraySchema<
  const Values extends readonly [string, ...string[]],
>(values: Values, separator = ",") {
  return z
    .preprocess(
      (value) => {
        const rawValues = Array.isArray(value)
          ? value
          : typeof value === "string"
            ? [value]
            : [];

        return rawValues.length === 1 && typeof rawValues[0] === "string"
          ? splitDelimitedValue(rawValues[0], separator)
          : rawValues;
      },
      z.array(z.enum(values)).catch([]),
    )
    .default([]);
}
