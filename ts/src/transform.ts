import ts from "typescript";
import { match } from "ts-pattern";

export default (program: ts.Program) => {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      const visitor = (node: ts.Node): ts.Node => {
        const replacementNode = match<ts.Node, ts.Node | undefined>(node)
          .with(
            {
              kind: ts.SyntaxKind.PropertyDeclaration,
              name: {
                kind: ts.SyntaxKind.Identifier,
              },
              initializer: {
                kind: ts.SyntaxKind.CallExpression,
                expression: {
                  kind: ts.SyntaxKind.PropertyAccessExpression,
                  expression: {
                    kind: ts.SyntaxKind.Identifier,
                    escapedText: "Jagger",
                  },
                  name: {
                    kind: ts.SyntaxKind.Identifier,
                    escapedText: "provide",
                  },
                },
                arguments: [
                  {
                    kind: ts.SyntaxKind.Identifier,
                  },
                ],
              },
            },
            (node) => {
              const propertyDeclaration =
                node as unknown as ts.PropertyDeclaration;
              const typeChecker = program.getTypeChecker();
              const argument = node.initializer.arguments[0] as ts.Identifier;
              const argumentSymbol = typeChecker.getSymbolAtLocation(argument);
              const argumentClassDeclaration = match<
                ts.Symbol | undefined,
                ts.ClassDeclaration | undefined
              >(argumentSymbol)
                .with(
                  {
                    declarations: [
                      {
                        kind: ts.SyntaxKind.ClassDeclaration,
                      },
                    ],
                  },
                  (argumentSymbol) =>
                    argumentSymbol.declarations[0] as ts.ClassDeclaration
                )
                .with(
                  {
                    declarations: [
                      {
                        kind: ts.SyntaxKind.ImportSpecifier,
                      },
                    ],
                  },
                  (argumentSymbol) => {
                    const typeChecker = program.getTypeChecker();
                    const declaration = argumentSymbol
                      .declarations[0] as ts.ImportSpecifier;
                    const moduleSpecifierSymbol =
                      typeChecker.getSymbolAtLocation(
                        declaration.parent.parent.parent.moduleSpecifier
                      );
                    const exportSymbol = moduleSpecifierSymbol?.exports?.get(
                      declaration.name.escapedText
                    );
                    return match(exportSymbol)
                      .with(
                        {
                          valueDeclaration: {
                            kind: ts.SyntaxKind.ClassDeclaration,
                          },
                        },
                        (exportSymbol) =>
                          exportSymbol.valueDeclaration as ts.ClassDeclaration
                      )
                      .otherwise(() => undefined);
                  }
                )
                .otherwise(() => undefined);
              if (argumentClassDeclaration === undefined) {
                return undefined;
              }
              const argumentClassDeclarationConstructorDeclaration =
                argumentClassDeclaration.members.find(
                  ts.isConstructorDeclaration
                );
              if (
                argumentClassDeclarationConstructorDeclaration === undefined
              ) {
                return undefined;
              }
              const argumentClassDeclarationConstructorDeclarationParameters =
                argumentClassDeclarationConstructorDeclaration.parameters;
              const argumentClassDeclarationConstructorDeclarationParametersTypes: ts.TypeReferenceNode[] =
                [];
              for (const {
                type,
              } of argumentClassDeclarationConstructorDeclarationParameters) {
                if (!(type !== undefined && ts.isTypeReferenceNode(type))) {
                  return undefined;
                }
                argumentClassDeclarationConstructorDeclarationParametersTypes.push(
                  type
                );
              }
              const argumentClassDeclarationConstructorDeclarationParametersTypesTypeNames: ts.Identifier[] =
                [];
              for (const {
                typeName,
              } of argumentClassDeclarationConstructorDeclarationParametersTypes) {
                if (!ts.isIdentifier(typeName)) {
                  return undefined;
                }
                argumentClassDeclarationConstructorDeclarationParametersTypesTypeNames.push(
                  typeName
                );
              }
              return context.factory.createPropertyDeclaration(
                propertyDeclaration.modifiers,
                propertyDeclaration.name,
                propertyDeclaration.questionToken ??
                  propertyDeclaration.exclamationToken ??
                  undefined,
                propertyDeclaration.type,
                context.factory.createFunctionExpression(
                  [],
                  undefined,
                  propertyDeclaration.name as ts.Identifier,
                  [],
                  [],
                  undefined,
                  context.factory.createBlock([
                    context.factory.createReturnStatement(
                      context.factory.createNewExpression(
                        argument,
                        [],
                        argumentClassDeclarationConstructorDeclarationParametersTypesTypeNames.map(
                          ({ escapedText }) =>
                            context.factory.createCallExpression(
                              context.factory.createPropertyAccessExpression(
                                context.factory.createThis(),
                                context.factory.createIdentifier(
                                  "provide" + escapedText
                                )
                              ),
                              undefined,
                              []
                            )
                        )
                      )
                    ),
                  ])
                )
              );
            }
          )
          .otherwise(() => undefined);
        return replacementNode ?? ts.visitEachChild(node, visitor, context);
      };
      return ts.visitNode(sourceFile, visitor);
    };
  };
};
