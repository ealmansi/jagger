import ts from "typescript";
import assert from "assert/strict";

export default (program: ts.Program) => {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      return ts.visitNode(
        sourceFile,
        createVisitor({ program, context, sourceFile }),
      );
    };
  };
};

type Environment = {
  program: ts.Program;
  context: ts.TransformationContext;
  sourceFile: ts.SourceFile;
};

function createVisitor(environment: Environment) {
  return function visitor(node: ts.Node): ts.Node {
    const { context } = environment;
    if (
      !(
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.escapedText === "Jagger" &&
        ts.isIdentifier(node.expression.name) &&
        node.expression.name.escapedText === "provide"
      )
    ) {
      return ts.visitEachChild(node, visitor, context);
    }

    assert.ok(
      node.parent.parent &&
        ts.isClassDeclaration(node.parent.parent) &&
        node.parent.parent.name !== undefined,
      [
        "[Jagger]",
        "Expected provider to be a property declaration",
        "enclosed in a named class declaration.",
      ].join(" "),
    );

    assert.ok(
      node.parent &&
        ts.isPropertyDeclaration(node.parent) &&
        node.parent.initializer === node,
      [
        "[Jagger]",
        "Expected provide expression to appear as",
        "initializer within a property declaration.",
      ].join(" "),
    );

    assert.ok(
      node.arguments.length === 1 &&
        node.arguments[0] !== undefined &&
        ts.isIdentifier(node.arguments[0]),
      [
        "[Jagger]",
        "Expected provide expression to have exactly",
        "one identifier as argument.",
      ].join(" "),
    );

    const classDeclaration = findClassDeclarationForIdentifier(
      node.arguments[0],
      environment,
    );

    assert.ok(
      classDeclaration !== undefined,
      [
        "[Jagger]",
        "Expected provide expression argument to have",
        "an associated class declaration.",
      ].join(" "),
    );

    const constructorDeclaration = classDeclaration.members.find(
      ts.isConstructorDeclaration,
    );

    assert.ok(
      constructorDeclaration !== undefined,
      [
        "[Jagger]",
        "Expected provided expression argument to have",
        "a constructor.",
      ].join(" "),
    );

    return createProvider(
      node.parent,
      classDeclaration,
      constructorDeclaration,
      environment,
    );
  };
}

function createProvider(
  propertyDeclaration: ts.PropertyDeclaration,
  classDeclaration: ts.ClassDeclaration,
  constructorDeclaration: ts.ConstructorDeclaration,
  environment: Environment,
): ts.Node {
  const { context } = environment;
  const { factory } = context;

  assert.ok(
    ts.isIdentifier(propertyDeclaration.name),
    [
      "[Jagger]",
      "Expected provider to be a property declaration",
      "named by an identifier.",
    ].join(" "),
  );

  const providerName = propertyDeclaration.name.escapedText.toString();
  const providerFactoryName = `${providerName}Factory`;

  assert.ok(
    classDeclaration.name !== undefined,
    "[Jagger] Expected injected class to have a name.",
  );

  const argumentsArray = constructorDeclaration.parameters.map((parameter) =>
    createProviderArgument(propertyDeclaration, parameter, environment),
  );

  return factory.createCallExpression(
    factory.createParenthesizedExpression(
      factory.createFunctionExpression(
        [],
        undefined,
        providerFactoryName,
        [],
        [],
        undefined,
        factory.createBlock([
          factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
              [
                factory.createVariableDeclaration(
                  factory.createIdentifier("instance"),
                  undefined,
                  undefined,
                  factory.createIdentifier("undefined"),
                ),
              ],
              ts.NodeFlags.Let,
            ),
          ),
          factory.createReturnStatement(
            factory.createFunctionExpression(
              [],
              undefined,
              factory.createIdentifier(providerName),
              [],
              [],
              undefined,
              factory.createBlock([
                factory.createExpressionStatement(
                  factory.createBinaryExpression(
                    factory.createIdentifier("instance"),
                    factory.createToken(ts.SyntaxKind.EqualsToken),
                    factory.createBinaryExpression(
                      factory.createIdentifier("instance"),
                      factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
                      factory.createNewExpression(
                        classDeclaration.name,
                        [],
                        argumentsArray,
                      ),
                    ),
                  ),
                ),
                factory.createReturnStatement(
                  factory.createIdentifier("instance"),
                ),
              ]),
            ),
          ),
        ]),
      ),
    ),
    [],
    [],
  );
}

function createProviderArgument(
  propertyDeclaration: ts.PropertyDeclaration,
  parameter: ts.ParameterDeclaration,
  environment: Environment,
): ts.Expression {
  const { program, context } = environment;
  const { factory } = context;
  const typeChecker = program.getTypeChecker();

  assert.ok(
    propertyDeclaration.parent !== undefined &&
      ts.isClassDeclaration(propertyDeclaration.parent),
    [
      "[Jagger]",
      "Expected property declaration parent to be a",
      "class declaration.",
    ].join(" "),
  );

  const providers = getProviders(propertyDeclaration.parent, environment);

  assert.ok(
    parameter.type &&
      ts.isTypeReferenceNode(parameter.type) &&
      ts.isIdentifier(parameter.type.typeName),
    [
      "[Jagger]",
      "Expected constructor parameter to have a type",
      "referenced by an identifier.",
    ].join(" "),
  );

  if (parameter.type.typeName.escapedText === "Set") {
    assert.ok(
      parameter.type.typeArguments !== undefined &&
        parameter.type.typeArguments.length === 1 &&
        parameter.type.typeArguments[0] !== undefined &&
        ts.isTypeReferenceNode(parameter.type.typeArguments[0]) &&
        ts.isIdentifier(parameter.type.typeArguments[0].typeName),
      [
        "[Jagger]",
        "Expected constructor parameter of type Set to have",
        "exactly one type argument referenced by an identifier.",
      ].join(" "),
    );

    const elements: ts.Expression[] = [];
    for (const { provider, provideable } of providers) {
      const provideableType = typeChecker.getTypeAtLocation(provideable);
      let candidateTypes: ts.Type[] = [provideableType];
      candidateTypes = candidateTypes.concat(
        candidateTypes.flatMap(
          (candidateType) =>
            typeChecker
              .getTypeAtLocation(candidateType.symbol.valueDeclaration!)
              .getBaseTypes() || [],
        ),
      );
      candidateTypes = candidateTypes.concat(
        candidateTypes.flatMap(
          (candidateType) =>
            typeChecker
              .getTypeAtLocation(candidateType.symbol.valueDeclaration!)
              .getBaseTypes() || [],
        ),
      );
      for (const candidateType of candidateTypes) {
        const candidateTypeSymbol = candidateType.getSymbol();
        if (
          candidateTypeSymbol !== undefined &&
          candidateTypeSymbol.valueDeclaration !== undefined &&
          ts.isClassDeclaration(candidateTypeSymbol.valueDeclaration) &&
          candidateTypeSymbol.valueDeclaration.name !== undefined &&
          candidateTypeSymbol.valueDeclaration.name.escapedText ===
            parameter.type.typeArguments[0].typeName.escapedText
        ) {
          elements.push(
            factory.createCallExpression(
              factory.createPropertyAccessExpression(
                factory.createThis(),
                factory.createIdentifier(provider),
              ),
              [],
              [],
            ),
          );
        }
      }
    }

    return factory.createNewExpression(
      factory.createIdentifier("Set"),
      [],
      [factory.createArrayLiteralExpression(elements)],
    );
  }

  let parameterProvider: string | undefined;
  for (const { provider, provideable } of providers) {
    if (
      provideable.name !== undefined &&
      provideable.name.escapedText === parameter.type.typeName.escapedText
    ) {
      parameterProvider = provider;
      break;
    }
  }
  assert.ok(
    parameterProvider !== undefined,
    [
      "[Jagger]",
      "Expected parameter to have a provider in the",
      "enclosing class declaration.",
    ].join(" "),
  );

  return factory.createCallExpression(
    factory.createPropertyAccessExpression(
      factory.createThis(),
      factory.createIdentifier(parameterProvider),
    ),
    [],
    [],
  );
}

function getProviders(
  classDeclaration: ts.ClassDeclaration,
  environment: Environment,
) {
  const { program } = environment;
  const typeChecker = program.getTypeChecker();
  const type = typeChecker.getTypeAtLocation(classDeclaration);
  const providers: {
    provider: string;
    provideable: ts.ClassDeclaration;
  }[] = [];
  for (const property of type.getProperties()) {
    if (property.valueDeclaration === undefined) {
      continue;
    }
    const propertyType = typeChecker.getTypeAtLocation(
      property.valueDeclaration,
    );

    const callSignatures = propertyType.getCallSignatures();
    assert.ok(
      callSignatures.length === 1 && callSignatures[0] !== undefined,
      [
        "[Jagger]",
        "Expected property in class declaration to have",
        "exactly one call signature.",
      ].join(" "),
    );

    const returnType = callSignatures[0].getReturnType();
    assert.ok(
      returnType.symbol.valueDeclaration !== undefined &&
        ts.isClassDeclaration(returnType.symbol.valueDeclaration) &&
        returnType.symbol.valueDeclaration.name !== undefined,
      [
        "[Jagger]",
        "Expected property in class declaration to have",
        "a return type with kind class declaration.",
      ].join(" "),
    );

    providers.push({
      provider: property.escapedName.toString(),
      provideable: returnType.symbol.valueDeclaration,
    });
  }
  return providers;
}

function findClassDeclarationForIdentifier(
  identifier: ts.Identifier,
  environment: Environment,
): ts.ClassDeclaration | undefined {
  const { program } = environment;
  const typeChecker = program.getTypeChecker();
  const symbol = typeChecker.getSymbolAtLocation(identifier);
  if (
    !(
      symbol !== undefined &&
      symbol.declarations !== undefined &&
      symbol.declarations.length === 1 &&
      symbol.declarations[0] !== undefined
    )
  ) {
    return undefined;
  }
  const declaration = symbol.declarations[0];
  if (ts.isClassDeclaration(declaration)) {
    return declaration;
  }
  if (ts.isImportSpecifier(declaration)) {
    return findClassDeclarationForImportSpecifier(declaration, environment);
  }
  return undefined;
}

function findClassDeclarationForImportSpecifier(
  importSpecifier: ts.ImportSpecifier,
  environment: Environment,
): ts.ClassDeclaration | undefined {
  const { program } = environment;
  const typeChecker = program.getTypeChecker();
  const moduleSpecifierSymbol = typeChecker.getSymbolAtLocation(
    importSpecifier.parent.parent.parent.moduleSpecifier,
  );
  if (
    !(
      moduleSpecifierSymbol !== undefined &&
      moduleSpecifierSymbol.exports !== undefined
    )
  ) {
    return undefined;
  }
  const exportSymbol = moduleSpecifierSymbol.exports.get(
    importSpecifier.name.escapedText,
  );
  if (
    !(
      exportSymbol !== undefined &&
      exportSymbol.valueDeclaration !== undefined &&
      ts.isClassDeclaration(exportSymbol.valueDeclaration)
    )
  ) {
    return undefined;
  }
  return exportSymbol.valueDeclaration;
}
