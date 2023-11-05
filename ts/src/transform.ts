import ts from "typescript";

export default (program: ts.Program) => {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      const visitor = (node: ts.Node): ts.Node => {
        const typeChecker = program.getTypeChecker();
        do {
          if (!ts.isPropertyDeclaration(node)) {
            break;
          }
          if (!ts.isIdentifier(node.name)) {
            break;
          }
          const nodeName = node.name;
          if (
            !(
              node.initializer !== undefined &&
              ts.isExpressionWithTypeArguments(node.initializer)
            )
          ) {
            break;
          }
          const nodeInitializer = node.initializer;
          if (!ts.isPropertyAccessExpression(nodeInitializer.expression)) {
            break;
          }
          const nodeInitializerExpression = nodeInitializer.expression;
          if (!ts.isIdentifier(nodeInitializerExpression.expression)) {
            break;
          }
          const nodeInitializerExpressionExpression =
            nodeInitializerExpression.expression;
          if (nodeInitializerExpressionExpression.escapedText !== "Jagger") {
            break;
          }
          if (!ts.isIdentifier(nodeInitializerExpression.name)) {
            break;
          }
          const nodeInitializerExpressionName = nodeInitializerExpression.name;
          if (nodeInitializerExpressionName.escapedText !== "provide") {
            break;
          }
          if (nodeInitializer.typeArguments === undefined) {
            break;
          }
          const nodeInitializerTypeArguments = nodeInitializer.typeArguments;
          if (
            !(
              nodeInitializerTypeArguments.length === 1 &&
              nodeInitializerTypeArguments[0] !== undefined &&
              ts.isTypeReferenceNode(nodeInitializerTypeArguments[0])
            )
          ) {
            break;
          }
          const nodeInitializerTypeArgument = nodeInitializerTypeArguments[0];
          if (!ts.isIdentifier(nodeInitializerTypeArgument.typeName)) {
            break;
          }
          const nodeInitializerTypeArgumentTypeName =
            nodeInitializerTypeArgument.typeName;
          const nodeInitializerTypeArgumentTypeNameSymbol =
            typeChecker.getSymbolAtLocation(
              nodeInitializerTypeArgumentTypeName,
            );
          if (
            !(
              nodeInitializerTypeArgumentTypeNameSymbol !== undefined &&
              nodeInitializerTypeArgumentTypeNameSymbol.declarations !==
                undefined
            )
          ) {
            break;
          }
          const nodeInitializerTypeArgumentTypeNameSymbolDeclarations =
            nodeInitializerTypeArgumentTypeNameSymbol.declarations;
          if (
            !(
              nodeInitializerTypeArgumentTypeNameSymbolDeclarations.length ===
                1 &&
              nodeInitializerTypeArgumentTypeNameSymbolDeclarations[0] !==
                undefined &&
              ts.isClassDeclaration(
                nodeInitializerTypeArgumentTypeNameSymbolDeclarations[0],
              )
            )
          ) {
            break;
          }
          const nodeInitializerTypeArgumentTypeNameSymbolClassDeclaration =
            nodeInitializerTypeArgumentTypeNameSymbolDeclarations[0];
          const nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclaration =
            nodeInitializerTypeArgumentTypeNameSymbolClassDeclaration.members.find(
              ts.isConstructorDeclaration,
            );
          if (
            nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclaration ===
            undefined
          ) {
            break;
          }
          const nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclarationParameters =
            nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclaration.parameters;
          const nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclarationParametersTypes: ts.TypeReferenceNode[] =
            [];
          for (const {
            type,
          } of nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclarationParameters) {
            if (!(type !== undefined && ts.isTypeReferenceNode(type))) {
              break;
            }
            nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclarationParametersTypes.push(
              type,
            );
          }
          const nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclarationParametersTypesTypeNames: ts.Identifier[] =
            [];
          for (const {
            typeName,
          } of nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclarationParametersTypes) {
            if (!ts.isIdentifier(typeName)) {
              break;
            }
            nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclarationParametersTypesTypeNames.push(
              typeName,
            );
          }
          return context.factory.createPropertyDeclaration(
            node.modifiers,
            nodeName,
            node.questionToken ?? node.exclamationToken ?? undefined,
            node.type,
            context.factory.createFunctionExpression(
              [],
              undefined,
              nodeName,
              [],
              [],
              undefined,
              context.factory.createBlock([
                context.factory.createReturnStatement(
                  context.factory.createNewExpression(
                    nodeInitializerTypeArgumentTypeName,
                    [],
                    nodeInitializerTypeArgumentTypeNameSymbolClassDeclarationConstructorDeclarationParametersTypesTypeNames.map(
                      ({ escapedText }) =>
                        context.factory.createCallExpression(
                          context.factory.createPropertyAccessExpression(
                            context.factory.createThis(),
                            context.factory.createIdentifier(
                              "provide" + escapedText,
                            ),
                          ),
                          undefined,
                          [],
                        ),
                    ),
                  ),
                ),
              ]),
            ),
          );
        } while (false);
        return ts.visitEachChild(node, visitor, context);
      };
      return ts.visitNode(sourceFile, visitor);
    };
  };
};
