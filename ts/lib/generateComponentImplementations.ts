import { createComponentImplementationsBundle } from "./createComponentImplementationsBundle.js";
import { loadProgramFromTsConfigFile } from "./loadProgramFromTsConfig.js";
import { writeBundle } from "./writeBundle.js";

export function generateComponentImplementations(
  tsConfigFileName: string | undefined,
) {
  const program = loadProgramFromTsConfigFile(tsConfigFileName);
  const componentImplementationsBundle =
    createComponentImplementationsBundle(program);
  writeBundle(componentImplementationsBundle);
}
