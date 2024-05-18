import ts from "typescript";
import { createComponentImplementationsBundle } from "./createComponentImplementationsBundle.js";
import { loadProgramFromTsConfigFile } from "./loadProgramFromTsConfig.js";
import { writeBundle } from "./writeBundle.js";

export function generateComponentImplementations(
  system: ts.System,
  tsConfigFileName: string | undefined,
) {
  const program = loadProgramFromTsConfigFile(system, tsConfigFileName);
  const componentImplementationsBundle =
    createComponentImplementationsBundle(program);
  writeBundle(system, componentImplementationsBundle);
}
