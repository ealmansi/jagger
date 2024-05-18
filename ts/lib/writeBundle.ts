import ts from "typescript";
import path from "node:path";

export function writeBundle(system: ts.System, bundle: ts.Bundle) {
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });
  for (const sourceFile of bundle.sourceFiles) {
    writeSourceFile(system, printer, sourceFile);
  }
}

function writeSourceFile(
  system: ts.System,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
) {
  const dirName = path.dirname(sourceFile.fileName);
  system.createDirectory(dirName);
  system.writeFile(
    sourceFile.fileName,
    printer.printList(
      ts.ListFormat.MultiLine,
      sourceFile.statements,
      sourceFile,
    ),
  );
}
