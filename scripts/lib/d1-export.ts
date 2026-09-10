import { Buffer } from "node:buffer";

export function sqlLiteral(value: unknown): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "bigint" && Number.isSafeInteger(Number(value)))
    return String(value);
  if (typeof value === "string") {
    // Hex-encoded text preserves quotes, newlines, and NUL bytes in SQL imports.
    return `CAST(X'${Buffer.from(value, "utf8").toString("hex")}' AS TEXT)`;
  }
  throw new Error("The export contains an unsupported value.");
}

export function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}
