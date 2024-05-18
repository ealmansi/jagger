import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as prettier from "prettier";
import ts from "typescript";
import { createComponentImplementationsBundle } from "../lib/createComponentImplementationsBundle.js";

describe("createComponentImplementationsBundle", async () => {
  it("can generate a component implementation", async () => {
    const bundle = createComponentImplementationsBundle(
      createProgram(
        "src/SomeComponent.ts",
        `
          import { Jagger } from "@ealmansi/jagger";
          class SomeModule extends Jagger.Module {
          }
          class SomeComponent extends Jagger.Component {
            static module: SomeModule;
          }
        `,
      ),
    );
    const sourceFile = bundle.sourceFiles.at(0);
    assert.ok(sourceFile);
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
    });
    const sourceFileText = printer.printList(
      ts.ListFormat.MultiLine,
      sourceFile.statements,
      sourceFile,
    );
    const actual = await prettier.format(sourceFileText, { parser: "babel" });
    const expected = await prettier.format(
      `
      import { SomeComponent } from "../SomeComponent.js";
      export class SomeComponentImpl extends SomeComponent {
        constructor() {
            super();
        }
      }
    `,
      { parser: "babel" },
    );
    assert.equal(actual, expected);
  });
});

function createProgram(
  sourceFileName: string,
  sourceFileText: string,
): ts.Program {
  const sourceFile = ts.createSourceFile(
    sourceFileName,
    sourceFileText,
    ts.ScriptTarget.Latest,
  );
  const compilerHost: ts.CompilerHost = {
    fileExists: (fileName) => fileName === sourceFile.fileName,
    directoryExists: (dirPath) => dirPath === "/",
    getCurrentDirectory: () => "/",
    getDirectories: () => [],
    getCanonicalFileName: (fileName) => fileName,
    getNewLine: () => "\n",
    getDefaultLibFileName: () => "",
    getSourceFile: (fileName) =>
      fileName === sourceFile.fileName ? sourceFile : undefined,
    readFile: (fileName) =>
      fileName === sourceFile.fileName ? sourceFile.text : undefined,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };
  return ts.createProgram({
    options: {},
    rootNames: [sourceFile.fileName],
    host: compilerHost,
  });
}
