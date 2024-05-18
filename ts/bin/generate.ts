#!/usr/bin/env -S node --no-warnings

import { Command } from "commander";
import packageJson from "../../package.json" assert { type: "json" };
import { generateComponentImplementations } from "../lib/generateComponentImplementations.js";
import ts from "typescript";

function main() {
  const options = new Command()
    .name("jagger-generate")
    .version(packageJson.version)
    .option("-p, --project <path>", "path to tsconfig.json")
    .parse(process.argv)
    .opts();
  const tsConfigFileName =
    typeof options["project"] === "string" ? options["project"] : undefined;
  generateComponentImplementations(ts.sys, tsConfigFileName);
}

main();
