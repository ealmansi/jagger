import ts from "typescript";
import path from "node:path";
import assert from "node:assert/strict";

export function loadProgramFromTsConfigFile(
  system: ts.System,
  tsConfigFilePath: string | undefined,
): ts.Program {
  if (tsConfigFilePath === undefined) {
    const searchPath = system.resolvePath(system.getCurrentDirectory());
    tsConfigFilePath = ts.findConfigFile(searchPath, system.fileExists);
    assert.ok(tsConfigFilePath, "Could not find tsconfig.json file");
  }
  const readConfigFileResult = ts.readConfigFile(
    tsConfigFilePath,
    system.readFile,
  );
  if (readConfigFileResult.error !== undefined) {
    if (typeof readConfigFileResult.error.messageText === "string") {
      assert.fail(readConfigFileResult.error.messageText);
    } else {
      assert.fail(readConfigFileResult.error.messageText.messageText);
    }
  }
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    readConfigFileResult.config,
    system,
    path.dirname(tsConfigFilePath),
  );
  const createProgramOptions: ts.CreateProgramOptions = {
    options: parsedCommandLine.options,
    rootNames: parsedCommandLine.fileNames,
    ...(parsedCommandLine.projectReferences !== undefined
      ? {
          projectReferences: parsedCommandLine.projectReferences,
        }
      : {}),
    configFileParsingDiagnostics: parsedCommandLine.errors,
  };
  return ts.createProgram(createProgramOptions);
}
