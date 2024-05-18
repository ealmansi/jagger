#!/usr/bin/env -S node --no-warnings

import { Command } from "commander";
import assert from "node:assert/strict";
import ts from "typescript";
import packageJson from "../../package.json" assert { type: "json" };
import { generateComponentImplementations } from "../lib/generateComponentImplementations.js";

function main() {
  const system = ts.sys;
  const { project: tsConfigFilePath } = parseCommandLineArguments();
  generateComponentImplementations(system, tsConfigFilePath);
}

function parseCommandLineArguments() {
  const values = new Command()
    .name("jagger-generate")
    .version(packageJson.version)
    .option("-p, --project <path>", "path to tsconfig.json")
    .parse(process.argv)
    .opts();
  const project: unknown = values["project"];
  assert.ok(project === undefined || typeof project === "string");
  return { project };
}

main();
