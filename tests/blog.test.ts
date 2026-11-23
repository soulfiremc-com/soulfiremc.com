import assert from "node:assert/strict";
import test from "node:test";
import { parseCalculatorNumber } from "@/components/mdx/donut-calculator-format";
import { formatBlogDate } from "@/lib/blog-date";

void test("formatBlogDate keeps the front-matter calendar day in every time zone", () => {
  const previous = process.env["TZ"];
  try {
    for (const zone of ["America/Los_Angeles", "UTC", "Pacific/Kiritimati"]) {
      process.env["TZ"] = zone;
      assert.equal(formatBlogDate("2026-02-24T00:00:00.000Z"), "Feb 24, 2026");
      assert.equal(formatBlogDate(new Date("2026-02-24")), "Feb 24, 2026");
    }
  } finally {
    process.env["TZ"] = previous;
  }
});

void test("parseCalculatorNumber lets users clear and retype fields", () => {
  const bots = { min: 1, max: 1000, fallback: 1 };
  assert.equal(parseCalculatorNumber("", bots), 1);
  assert.equal(parseCalculatorNumber("25", bots), 25);
  assert.equal(parseCalculatorNumber("0", bots), 1);
  assert.equal(parseCalculatorNumber("5000", bots), 1000);

  const ratio = { min: 0, max: 1, fallback: 0 };
  assert.equal(parseCalculatorNumber("0.", ratio), 0);
  assert.equal(parseCalculatorNumber("0.07", ratio), 0.07);
  assert.equal(parseCalculatorNumber("-3", ratio), 0);
});
