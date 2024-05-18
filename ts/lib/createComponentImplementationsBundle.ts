import ts from "typescript";
import path from "node:path";
import assert from "node:assert/strict";
import { Graph, buildGraph } from "./buildGraph.js";
import {
  GraphResolution,
  TypeResolution,
  buildGraphResolution,
} from "./buildGraphResolution.js";
import { ok } from "./ok.js";

export function createComponentImplementationsBundle(
  program: ts.Program,
): ts.Bundle {
  const factory = ts.factory;
  const graph = buildGraph(program);
  const graphResolution = buildGraphResolution(program, graph);
  return factory.createBundle(
    graph.components.map((component) => {
      return createComponentImplementationSourceFile(
        program,
        graph,
        graphResolution,
        component,
      );
    }),
  );
}

function createComponentImplementationSourceFile(
  program: ts.Program,
  graph: Graph,
  graphResolution: GraphResolution,
  component: ts.ClassDeclaration,
): ts.SourceFile {
  const factory = ts.factory;
  const inputSourceFile = component.getSourceFile();
  const inputFileName = inputSourceFile.fileName;
  const outputFileName = path.join(
    path.dirname(inputFileName),
    "gen",
    path.basename(inputFileName),
  );
  const outputSourceFile = factory.createSourceFile(
    [
      ...createComponentImportDeclarations(
        program,
        graph,
        graphResolution,
        component,
        outputFileName,
      ),
      createComponentClassDeclaration(
        program,
        graph,
        graphResolution,
        component,
      ),
    ],
    factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None,
  );
  outputSourceFile.fileName = outputFileName;
  return outputSourceFile;
}

function createComponentImportDeclarations(
  _program: ts.Program,
  _graph: Graph,
  graphResolution: GraphResolution,
  component: ts.ClassDeclaration,
  outputFileName: string,
): ts.ImportDeclaration[] {
  const factory = ts.factory;
  const moduleInstances = ok(
    graphResolution.componentModuleInstances.get(component),
  );
  return [component, ...moduleInstances].map((componentOrModule) => {
    const sourceFile = componentOrModule.getSourceFile();
    const inputFileName = sourceFile.fileName;
    const inputParsedPath = path.parse(inputFileName);
    const outputParsedPath = path.parse(outputFileName);
    const leadingDot = inputParsedPath.dir === outputParsedPath.dir ? "./" : "";
    const importPath =
      leadingDot +
      path.join(
        path.relative(outputParsedPath.dir, inputParsedPath.dir),
        inputParsedPath.name + ".js",
      );
    assert.ok(componentOrModule.name, "componentOrModule.name");
    return factory.createImportDeclaration(
      undefined,
      factory.createImportClause(
        false,
        undefined,
        factory.createNamedImports([
          factory.createImportSpecifier(
            false,
            undefined,
            factory.createIdentifier(componentOrModule.name.text),
          ),
        ]),
      ),
      factory.createStringLiteral(importPath),
      undefined,
    );
  });
}

function createComponentClassDeclaration(
  _program: ts.Program,
  graph: Graph,
  graphResolution: GraphResolution,
  component: ts.ClassDeclaration,
): ts.ClassDeclaration {
  const factory = ts.factory;
  assert.ok(component.name, "component.name");
  const resolvers = graph.componentResolvers.get(component);
  assert.ok(resolvers, "resolvers");
  const moduleInstances = ok(
    graphResolution.componentModuleInstances.get(component),
  );
  const typeResolutions = ok(
    graphResolution.componentTypeResolutions.get(component),
  );
  const typeResolutionNames = new Set<string>();
  const syntheticTypeResolutionName = new Map<TypeResolution, string>();
  return factory.createClassDeclaration(
    [factory.createToken(ts.SyntaxKind.ExportKeyword)],
    factory.createIdentifier(component.name.text + "Impl"),
    undefined,
    [
      factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
        factory.createExpressionWithTypeArguments(
          factory.createIdentifier(component.name.text),
          undefined,
        ),
      ]),
    ],
    [
      ...resolvers.map((resolver) => {
        assert.ok(
          ts.isIdentifier(resolver.name),
          "ts.isIdentifier(resolver.name)",
        );
        const resolverReturnType = graph.resolverReturnType.get(resolver);
        assert.ok(resolverReturnType, "resolverReturnType");
        const module = graph.componentModule.get(component);
        assert.ok(module, "module");
        const typeResolution = ok(
          graphResolution.resolverTypeResolution.get(resolver),
        );
        return factory.createMethodDeclaration(
          undefined,
          undefined,
          factory.createIdentifier(resolver.name.text),
          undefined,
          undefined,
          [],
          undefined,
          factory.createBlock(
            [
              factory.createReturnStatement(
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    factory.createThis(),
                    factory.createIdentifier(
                      buildTypeResolutionName(
                        typeResolution,
                        syntheticTypeResolutionName,
                      ),
                    ),
                  ),
                  undefined,
                  [],
                ),
              ),
            ],
            true,
          ),
        );
      }),
      ...moduleInstances.map((moduleInstance) => {
        assert.ok(moduleInstance.name, "module.name");
        return factory.createPropertyDeclaration(
          [factory.createToken(ts.SyntaxKind.PrivateKeyword)],
          factory.createIdentifier("_" + moduleInstance.name.text),
          undefined,
          undefined,
          undefined,
        );
      }),
      factory.createConstructorDeclaration(
        undefined,
        [],
        factory.createBlock(
          [
            factory.createExpressionStatement(
              factory.createCallExpression(
                factory.createSuper(),
                undefined,
                [],
              ),
            ),
            ...moduleInstances.map((moduleInstance) => {
              assert.ok(moduleInstance.name, "module.name");
              return factory.createExpressionStatement(
                factory.createBinaryExpression(
                  factory.createPropertyAccessExpression(
                    factory.createThis(),
                    factory.createIdentifier("_" + moduleInstance.name.text),
                  ),
                  factory.createToken(ts.SyntaxKind.EqualsToken),
                  factory.createNewExpression(
                    factory.createIdentifier(moduleInstance.name.text),
                    undefined,
                    [],
                  ),
                ),
              );
            }),
          ],
          true,
        ),
      ),
      ...typeResolutions.flatMap((typeResolution) => {
        switch (typeResolution.kind) {
          case "ProviderTypeResolution":
            const typeResolutionName = buildTypeResolutionName(
              typeResolution,
              syntheticTypeResolutionName,
            );
            if (typeResolutionNames.has(typeResolutionName)) {
              return [];
            }
            typeResolutionNames.add(typeResolutionName);
            return [
              factory.createMethodDeclaration(
                [factory.createToken(ts.SyntaxKind.PrivateKeyword)],
                undefined,
                factory.createIdentifier(typeResolutionName),
                undefined,
                undefined,
                [],
                undefined,
                factory.createBlock(
                  [
                    factory.createReturnStatement(
                      factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                          factory.createPropertyAccessExpression(
                            factory.createThis(),
                            factory.createIdentifier(
                              "_" + ok(typeResolution.module.name).text,
                            ),
                          ),
                          factory.createIdentifier(
                            typeResolution.provider.name.getText(),
                          ),
                        ),
                        undefined,
                        [
                          ...typeResolution.parameterTypeResolutions.map(
                            (parameterTypeResolution) => {
                              return factory.createCallExpression(
                                factory.createPropertyAccessExpression(
                                  factory.createThis(),
                                  factory.createIdentifier(
                                    buildTypeResolutionName(
                                      parameterTypeResolution,
                                      syntheticTypeResolutionName,
                                    ),
                                  ),
                                ),
                                undefined,
                                [],
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                  true,
                ),
              ),
            ];
          case "SetTypeResolution":
            return [
              factory.createMethodDeclaration(
                [factory.createToken(ts.SyntaxKind.PrivateKeyword)],
                undefined,
                factory.createIdentifier(
                  buildTypeResolutionName(
                    typeResolution,
                    syntheticTypeResolutionName,
                  ),
                ),
                undefined,
                undefined,
                [],
                undefined,
                factory.createBlock(
                  [
                    factory.createReturnStatement(
                      factory.createNewExpression(
                        factory.createIdentifier("Set"),
                        undefined,
                        [
                          factory.createArrayLiteralExpression(
                            [
                              ...typeResolution.elementTypeResolutions.map(
                                (elementTypeResolution) => {
                                  return factory.createCallExpression(
                                    factory.createPropertyAccessExpression(
                                      factory.createThis(),
                                      factory.createIdentifier(
                                        buildTypeResolutionName(
                                          elementTypeResolution,
                                          syntheticTypeResolutionName,
                                        ),
                                      ),
                                    ),
                                    undefined,
                                    [],
                                  );
                                },
                              ),
                            ],
                            false,
                          ),
                        ],
                      ),
                    ),
                  ],
                  true,
                ),
              ),
            ];
        }
      }),
    ],
  );
}

function buildTypeResolutionName(
  typeResolution: TypeResolution,
  syntheticTypeResolutionName: Map<TypeResolution, string>,
): string {
  switch (typeResolution.kind) {
    case "ProviderTypeResolution":
      return (
        "_" +
        ok(typeResolution.module.name).text +
        "_" +
        typeResolution.provider.name.getText()
      );
    case "SetTypeResolution":
      if (!syntheticTypeResolutionName.has(typeResolution)) {
        syntheticTypeResolutionName.set(
          typeResolution,
          "synthetic_" + syntheticTypeResolutionName.size.toString(),
        );
      }
      return (
        "_" +
        ok(typeResolution.module.name).text +
        "_" +
        ok(syntheticTypeResolutionName.get(typeResolution))
      );
  }
}
