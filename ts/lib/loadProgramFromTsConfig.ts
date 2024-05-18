import ts from "typescript";
import path from "node:path";
import assert from "node:assert/strict";

export function loadProgramFromTsConfigFile(
  system: ts.System,
  tsConfigFileName: string | undefined,
): ts.Program {
  if (tsConfigFileName === undefined) {
    const searchPath = path.resolve(".");
    const tsConfigBaseName = "tsconfig.json";
    tsConfigFileName = ts.findConfigFile(
      searchPath,
      system.fileExists,
      tsConfigBaseName,
    );
    assert.ok(tsConfigFileName, "fileName");
  }
  const readConfigFileResult = ts.readConfigFile(
    tsConfigFileName,
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
    path.dirname(tsConfigFileName),
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
