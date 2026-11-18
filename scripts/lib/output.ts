import { formatWithOptions } from "node:util";

/** Writes a line to stdout, formatted like console.log. */
export function printLine(...values: unknown[]): void {
  process.stdout.write(`${formatWithOptions({ colors: false }, ...values)}\n`);
}

/** Writes a line to stderr, formatted like console.error. */
export function printError(...values: unknown[]): void {
  process.stderr.write(`${formatWithOptions({ colors: false }, ...values)}\n`);
}
