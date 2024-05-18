import { createComponentImplementationsBundle } from "./createComponentImplementationsBundle.js";
import { loadProgramFromTsConfig } from "./loadProgramFromTsConfig.js";
import { writeBundle } from "./writeBundle.js";

export function generateComponentImplementations() {
  const program = loadProgramFromTsConfig();
  const componentImplementationsBundle =
    createComponentImplementationsBundle(program);
  writeBundle(componentImplementationsBundle);
}
