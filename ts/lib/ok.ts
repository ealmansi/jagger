import assert from "node:assert/strict";

export function ok<T>(x: T): NonNullable<T> {
  assert.ok(x);
  return x;
}
