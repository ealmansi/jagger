import assert from "node:assert/strict";

export function orThrow<T extends {}>(value: T | null | undefined): T {
  assert.ok(value, "Expected value to be defined");
  return value;
}
