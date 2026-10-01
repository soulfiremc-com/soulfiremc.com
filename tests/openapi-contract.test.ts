import { strict as assert } from "node:assert";
import { test } from "node:test";
import { referencedSchemas } from "../src/lib/docs/openapi-contract";

test("API text includes transitive recursive schemas exactly once", () => {
  const schemas = {
    Tree: {
      properties: {
        child: { $ref: "#/components/schemas/Tree" },
        value: { $ref: "#/components/schemas/Value" },
      },
    },
    Value: { properties: { owner: { $ref: "#/components/schemas/Tree" } } },
    Unused: { type: "boolean" },
  };
  const contract = { requestBody: { $ref: "#/components/schemas/Tree" } };
  const result = referencedSchemas(contract, schemas);
  assert.deepEqual(Object.keys(result).sort(), ["Tree", "Value"]);
  assert.equal(result.Tree, schemas.Tree);
  assert.equal(result.Value, schemas.Value);
});

test("API schema references decode JSON pointers and reject missing local contracts", () => {
  const schema = { type: "string" };
  assert.deepEqual(
    referencedSchemas(
      { $ref: "#/components/schemas/path~1part~0name" },
      { "path/part~name": schema },
    ),
    { "path/part~name": schema },
  );
  assert.throws(() =>
    referencedSchemas({ $ref: "#/components/schemas/missing" }, {}),
  );
  assert.deepEqual(
    referencedSchemas({ $ref: "https://example.com/schema" }, {}),
    {},
  );
});
