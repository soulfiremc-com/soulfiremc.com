export { cn } from "cn";

export function generateN(count: number) {
  return Array.from(
    { length: Math.max(0, Math.floor(count)) },
    (_, index) => index + 1,
  );
}
