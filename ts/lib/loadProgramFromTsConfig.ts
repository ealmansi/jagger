import ts from "typescript";
import path from "node:path";
import assert from "node:assert/strict";

export function loadProgramFromTsConfigFile(
  tsConfigFileName: string | undefined,
): ts.Program {
  if (tsConfigFileName === undefined) {
    const searchPath = path.resolve(".");
    const tsConfigBaseName = "tsconfig.json";
    tsConfigFileName = ts.findConfigFile(
      searchPath,
      ts.sys.fileExists,
      tsConfigBaseName,
    );
    assert.ok(tsConfigFileName, "fileName");
  }
  const readConfigFileResult = ts.readConfigFile(
    tsConfigFileName,
    ts.sys.readFile,
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
    ts.sys,
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
