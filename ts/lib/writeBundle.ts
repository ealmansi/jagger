import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

export function writeBundle(bundle: ts.Bundle) {
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });
  for (const sourceFile of bundle.sourceFiles) {
    writeSourceFile(printer, sourceFile);
  }
}

function writeSourceFile(printer: ts.Printer, sourceFile: ts.SourceFile) {
  const dirName = path.dirname(sourceFile.fileName);
  fs.mkdirSync(dirName, { recursive: true });
  fs.writeFileSync(
    sourceFile.fileName,
    printer.printList(
      ts.ListFormat.MultiLine,
      sourceFile.statements,
      sourceFile,
    ),
  );
}
