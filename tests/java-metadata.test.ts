import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  builderCalls,
  parsePort,
  splitArguments,
} from "../scripts/lib/java-metadata";

test("metadata DSL preserves nested generic expressions and quoted punctuation", () => {
  const expression =
    '"items", "Items (a, b)", TypeDescriptor.map(TypeDescriptor.simple(PortType.STRING), TypeDescriptor.list(TypeDescriptor.typeVar("T"))), "A \\"quoted\\" description"';
  const args = splitArguments(expression);
  assert.equal(args.length, 4);
  const port = parsePort(`PortDefinition.genericInput(${expression})`, {});
  assert.equal(port.type, "map<string, list<T>>");
  assert.equal(port.required, true);
  assert.equal(port.description, 'A "quoted" description');
});

test("builder scanning ignores parentheses and commas inside escaped strings", () => {
  const calls = builderCalls(
    '.description("Comma, bracket ) and \\"quote\\"").addInputs(PortDefinition.execIn()).isTrigger(true)',
  );
  assert.equal(calls.length, 3);
  assert.equal(calls[1].args.length, 1);
  assert.throws(() => builderCalls('.description("unfinished") .futureField('));
});

test("port defaults distinguish JSON empty strings from an absent metadata default", () => {
  const explicit = parsePort(
    'PortDefinition.inputWithDefault("value", "Value", PortType.STRING, "\\"\\"", "Text")',
    {},
  );
  const absent = parsePort(
    'PortDefinition.inputWithDefault("value", "Value", PortType.STRING, "", "Text")',
    {},
  );
  assert.equal(explicit.defaultValue, "");
  assert.equal(Object.hasOwn(absent, "defaultValue"), false);
  assert.equal(absent.required, false);
  assert.equal(
    parsePort(
      'PortDefinition.output(StandardPorts.exec("case0"), "Case", PortType.EXEC, "Branch")',
      {},
    ).id,
    "exec_case0",
  );
  assert.throws(() => parsePort('PortDefinition.unknown("x")', {}));
  assert.throws(() =>
    parsePort(
      'PortDefinition.output(StandardPorts.MISSING, "Case", PortType.EXEC, "Branch")',
      {},
    ),
  );
});
