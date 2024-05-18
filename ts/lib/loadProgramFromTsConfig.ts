import ts from "typescript";
import path from "node:path";
import assert from "node:assert/strict";

export function loadProgramFromTsConfig(): ts.Program {
  const searchPath = path.resolve(".");
  const baseName = "tsconfig.json";
  const fileName = ts.findConfigFile(searchPath, ts.sys.fileExists, baseName);
  assert.ok(fileName, "fileName");
  const readConfigFileResult = ts.readConfigFile(fileName, ts.sys.readFile);
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
    path.dirname(fileName),
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
