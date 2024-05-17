#!/usr/bin/env node

import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

function main() {
  const context = buildContext();
  const graph = buildGraph(context);
  const graphResolution = buildGraphResolution(context, graph);
  for (const component of graph.components) {
    generateComponentImpl(context, graph, graphResolution, component);
  }
}

/**
 *
 */
interface Context {
  parsedCommandLine: ts.ParsedCommandLine;
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  factory: ts.NodeFactory;
}

function buildContext(): Context {
  const parseConfigHost: ts.ParseConfigHost = ts.sys;
  const searchPath = path.resolve(".");
  const baseName = "tsconfig.json";
  const fileName = ts.findConfigFile(
    searchPath,
    parseConfigHost.fileExists,
    baseName,
  );
  assert.ok(fileName, "fileName");
  const readConfigFileResult = ts.readConfigFile(
    fileName,
    parseConfigHost.readFile,
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
    parseConfigHost,
    path.dirname(fileName),
  );
  const program = ts.createProgram({
    options: parsedCommandLine.options,
    rootNames: parsedCommandLine.fileNames,
    projectReferences: parsedCommandLine.projectReferences,
    configFileParsingDiagnostics: parsedCommandLine.errors,
  });
  const typeChecker = program.getTypeChecker();
  const factory = ts.factory;
  return {
    parsedCommandLine,
    program,
    typeChecker,
    factory,
  };
}

/**
 *
 */
interface Graph {
  components: ts.ClassDeclaration[];
  componentModule: WeakMap<ts.ClassDeclaration, ts.ClassDeclaration>;
  componentResolvers: WeakMap<ts.ClassDeclaration, ts.MethodDeclaration[]>;
  resolverReturnType: WeakMap<ts.MethodDeclaration, ts.Type>;
  modules: ts.ClassDeclaration[];
  moduleImports: WeakMap<ts.ClassDeclaration, ts.ClassDeclaration[]>;
  moduleProviders: WeakMap<
    ts.ClassDeclaration,
    (ts.PropertyDeclaration | ts.MethodDeclaration)[]
  >;
  providerModule: WeakMap<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.ClassDeclaration
  >;
  providerParameterTypes: WeakMap<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.Type[]
  >;
  providerReturnType: WeakMap<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.Type
  >;
}

function buildGraph(context: Context): Graph {
  const components = getComponents(context);
  const modules = getModules(context);
  const componentModule = new WeakMap<
    ts.ClassDeclaration,
    ts.ClassDeclaration
  >();
  const componentResolvers = new WeakMap<
    ts.ClassDeclaration,
    ts.MethodDeclaration[]
  >();
  for (const component of components) {
    componentModule.set(component, getComponentModule(context, component));
    componentResolvers.set(
      component,
      getComponentResolvers(context, component),
    );
  }
  const resolverReturnType = new WeakMap<ts.MethodDeclaration, ts.Type>();
  for (const component of components) {
    const resolvers = componentResolvers.get(component);
    assert.ok(resolvers, "resolvers");
    for (const resolver of resolvers) {
      resolverReturnType.set(
        resolver,
        getResolverReturnType(context, resolver),
      );
    }
  }
  const moduleImports = new WeakMap<
    ts.ClassDeclaration,
    ts.ClassDeclaration[]
  >();
  const moduleProviders = new WeakMap<
    ts.ClassDeclaration,
    (ts.PropertyDeclaration | ts.MethodDeclaration)[]
  >();
  for (const module of modules) {
    moduleImports.set(module, getModuleImports(context, module));
    moduleProviders.set(module, getModuleProviders(context, module));
  }
  const providerModule = new WeakMap<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.ClassDeclaration
  >();
  const providerParameterTypes = new WeakMap<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.Type[]
  >();
  const providerReturnType = new WeakMap<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.Type
  >();
  for (const module of modules) {
    const providers = moduleProviders.get(module);
    assert.ok(providers, "providers");
    for (const provider of providers) {
      providerModule.set(provider, module);
      providerParameterTypes.set(
        provider,
        getProviderParameterTypes(context, provider),
      );
      providerReturnType.set(
        provider,
        getProviderReturnType(context, provider),
      );
    }
  }
  return {
    components,
    componentModule,
    componentResolvers,
    resolverReturnType,
    modules,
    moduleImports,
    moduleProviders,
    providerModule,
    providerParameterTypes,
    providerReturnType,
  };
}

/**
 *
 */
function getComponents(context: Context): ts.ClassDeclaration[] {
  const { program } = context;
  const components: ts.ClassDeclaration[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    visitSourceFile(sourceFile, {
      visitClassDeclaration(classDeclaration: ts.ClassDeclaration) {
        if (isComponent(classDeclaration)) {
          components.push(classDeclaration);
        }
      },
    });
  }
  return components;
}

function isComponent(classDeclaration: ts.ClassDeclaration): boolean {
  return (
    classDeclaration.heritageClauses !== undefined &&
    classDeclaration.heritageClauses.some(
      (heritageClause) =>
        heritageClause.token === ts.SyntaxKind.ExtendsKeyword &&
        heritageClause.types.length === 1 &&
        ts.isPropertyAccessExpression(heritageClause.types[0].expression) &&
        ts.isIdentifier(heritageClause.types[0].expression.expression) &&
        heritageClause.types[0].expression.expression.text === "Jagger" &&
        ts.isIdentifier(heritageClause.types[0].expression.name) &&
        heritageClause.types[0].expression.name.text === "Component",
    )
  );
}

function getModules(context: Context): ts.ClassDeclaration[] {
  const { program } = context;
  const modules: ts.ClassDeclaration[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    visitSourceFile(sourceFile, {
      visitClassDeclaration(classDeclaration: ts.ClassDeclaration) {
        if (isModule(classDeclaration)) {
          modules.push(classDeclaration);
        }
      },
    });
  }
  return modules;
}

function isModule(classDeclaration: ts.ClassDeclaration): boolean {
  return (
    classDeclaration.heritageClauses !== undefined &&
    classDeclaration.heritageClauses.some(
      (heritageClause) =>
        heritageClause.token === ts.SyntaxKind.ExtendsKeyword &&
        heritageClause.types.length === 1 &&
        ts.isPropertyAccessExpression(heritageClause.types[0].expression) &&
        ts.isIdentifier(heritageClause.types[0].expression.expression) &&
        heritageClause.types[0].expression.expression.text === "Jagger" &&
        ts.isIdentifier(heritageClause.types[0].expression.name) &&
        heritageClause.types[0].expression.name.text === "Module",
    )
  );
}

function getComponentModule(
  context: Context,
  component: ts.ClassDeclaration,
): ts.ClassDeclaration {
  const { typeChecker } = context;
  const classDeclaration = component.members
    .filter(ts.isPropertyDeclaration)
    .filter(
      (propertyDeclaration) =>
        propertyDeclaration.modifiers !== undefined &&
        propertyDeclaration.modifiers.some(
          (modifierLike) => modifierLike.kind === ts.SyntaxKind.StaticKeyword,
        ) &&
        ts.isIdentifier(propertyDeclaration.name) &&
        propertyDeclaration.name.text === "module",
    )
    .map((propertyDeclaration) => propertyDeclaration.type)
    .filter(isNotUndefined)
    .filter(ts.isTypeReferenceNode)
    .map((typeReferenceNode) => typeReferenceNode.typeName)
    .map(typeChecker.getTypeAtLocation)
    .map((type) => type.symbol)
    .flatMap((symbol) => symbol.getDeclarations())
    .filter(isNotUndefined)
    .find(ts.isClassDeclaration);
  assert.ok(classDeclaration, "classDeclaration");
  return classDeclaration;
}

function getComponentResolvers(
  _context: Context,
  component: ts.ClassDeclaration,
): ts.MethodDeclaration[] {
  return component.members
    .filter(ts.isMethodDeclaration)
    .filter(
      (methodDeclaration) =>
        methodDeclaration.modifiers !== undefined &&
        methodDeclaration.modifiers.some(
          (modifierLike) => modifierLike.kind === ts.SyntaxKind.AbstractKeyword,
        ),
    );
}

function getModuleImports(
  context: Context,
  module: ts.ClassDeclaration,
): ts.ClassDeclaration[] {
  const { typeChecker } = context;
  return module.members
    .filter(ts.isPropertyDeclaration)
    .filter(
      (propertyDeclaration) =>
        propertyDeclaration.modifiers !== undefined &&
        propertyDeclaration.modifiers.some(
          (modifierLike) => modifierLike.kind === ts.SyntaxKind.StaticKeyword,
        ) &&
        ts.isIdentifier(propertyDeclaration.name) &&
        propertyDeclaration.name.text === "imports",
    )
    .map((propertyDeclaration) => propertyDeclaration.type)
    .filter(isNotUndefined)
    .filter(ts.isTupleTypeNode)
    .flatMap((tupleTypeNode) => tupleTypeNode.elements)
    .filter(ts.isTypeReferenceNode)
    .map((typeReferenceNode) => typeReferenceNode.typeName)
    .map(typeChecker.getTypeAtLocation)
    .map((type) => type.symbol)
    .flatMap((symbol) => symbol.getDeclarations())
    .filter(isNotUndefined)
    .filter(ts.isClassDeclaration);
}

function getModuleProviders(
  context: Context,
  module: ts.ClassDeclaration,
): (ts.PropertyDeclaration | ts.MethodDeclaration)[] {
  const { typeChecker } = context;
  return [
    ...module.members
      .filter(ts.isPropertyDeclaration)
      .filter((propertyDeclaration) => {
        const signatures = typeChecker
          .getTypeAtLocation(propertyDeclaration)
          .getCallSignatures();
        return signatures.length === 1;
      }),
    ...module.members.filter(ts.isMethodDeclaration),
  ];
}

function getProviderParameterTypes(
  context: Context,
  provider: ts.PropertyDeclaration | ts.MethodDeclaration,
): ts.Type[] {
  const { typeChecker } = context;
  if (ts.isPropertyDeclaration(provider)) {
    const signatures = typeChecker
      .getTypeAtLocation(provider)
      .getCallSignatures();
    assert.ok(signatures.length === 1, "signatures.length === 1");
    const [signature] = signatures;
    const parameterSymbols = signature.getParameters();
    const parameterDeclarations = signature.getDeclaration().parameters;
    assert.ok(
      parameterSymbols.length === parameterDeclarations.length,
      "parameterSymbols.length === parameterDeclarations.length",
    );
    return parameterSymbols.flatMap((parameterSymbol, index) => {
      const type = typeChecker.getTypeOfSymbol(parameterSymbol);
      const parameterDeclaration = parameterDeclarations[index];
      if (parameterDeclaration.dotDotDotToken !== undefined) {
        if (type.getFlags() & ts.TypeFlags.Object) {
          const objectType = type as ts.ObjectType;
          if (objectType.objectFlags & ts.ObjectFlags.Reference) {
            const typeReference = type as ts.TypeReference;
            const typeArguments =
              context.typeChecker.getTypeArguments(typeReference);
            return typeArguments;
          }
        }
      }
      return [type];
    });
  } else {
    return provider.parameters
      .map((parameter) => parameter.type)
      .filter(isNotUndefined)
      .map(typeChecker.getTypeAtLocation);
  }
}

function getResolverReturnType(
  context: Context,
  resolver: ts.MethodDeclaration,
): ts.Type {
  const { typeChecker } = context;
  const typeNode = resolver.type;
  assert.ok(typeNode, "typeNode");
  return typeChecker.getTypeAtLocation(typeNode);
}

function getProviderReturnType(
  context: Context,
  provider: ts.PropertyDeclaration | ts.MethodDeclaration,
): ts.Type {
  const { typeChecker } = context;
  if (ts.isPropertyDeclaration(provider)) {
    const signatures = typeChecker
      .getTypeAtLocation(provider)
      .getCallSignatures();
    assert.ok(signatures.length === 1, "signatures.length === 1");
    const [signature] = signatures;
    return signature.getReturnType();
  } else {
    const typeNode = provider.type;
    assert.ok(typeNode, "typeNode");
    return typeChecker.getTypeAtLocation(typeNode);
  }
}

interface Visitor {
  visitClassDeclaration?(classDeclaration: ts.ClassDeclaration): void;
}

function visitSourceFile(sourceFile: ts.SourceFile, visitor: Visitor) {
  function visitNode(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
      visitor.visitClassDeclaration?.(node);
    }
    ts.forEachChild(node, visitNode);
  }
  visitNode(sourceFile);
}

function isNotUndefined<T extends {}>(x: T | undefined): x is T {
  return x !== undefined;
}

/**
 *
 */
type TypeResolution = ProviderTypeResolution | SetTypeResolution;

interface ProviderTypeResolution {
  kind: "ProviderTypeResolution";
  type: ts.Type;
  module: ts.ClassDeclaration;
  provider: ts.PropertyDeclaration | ts.MethodDeclaration;
  parameterTypeResolutions: TypeResolution[];
}

interface SetTypeResolution {
  kind: "SetTypeResolution";
  type: ts.Type;
  module: ts.ClassDeclaration;
  elementTypeResolutions: TypeResolution[];
}

interface GraphResolution {
  resolverTypeResolution: WeakMap<ts.MethodDeclaration, TypeResolution>;
  componentModuleInstances: WeakMap<ts.ClassDeclaration, ts.ClassDeclaration[]>;
  componentTypeResolutions: WeakMap<ts.ClassDeclaration, TypeResolution[]>;
}

function buildGraphResolution(context: Context, graph: Graph): GraphResolution {
  const resolverTypeResolution = new WeakMap<
    ts.MethodDeclaration,
    TypeResolution
  >();
  const componentModuleInstances = new WeakMap<
    ts.ClassDeclaration,
    ts.ClassDeclaration[]
  >();
  const componentTypeResolutions = new WeakMap<
    ts.ClassDeclaration,
    TypeResolution[]
  >();
  for (const component of graph.components) {
    componentModuleInstances.set(component, []);
    componentTypeResolutions.set(component, []);
    const module = ok(graph.componentModule.get(component));
    const resolvers = ok(graph.componentResolvers.get(component));
    for (const resolver of resolvers) {
      const returnType = ok(graph.resolverReturnType.get(resolver));
      const moduleStack = [module];
      const moduleTypeMap = new WeakMap<
        ts.ClassDeclaration,
        WeakSet<ts.Type>
      >();
      const returnTypeResolutions = Array.from(
        getTypeResolutions(
          context,
          graph,
          moduleStack,
          moduleTypeMap,
          returnType,
          0,
        ),
      );
      if (returnTypeResolutions.length === 0) {
        assert.fail(
          [
            "Failed to resolve type ",
            context.typeChecker.typeToString(returnType),
            " for ",
            resolver.name.getText(),
            " in ",
            ok(component.name).text,
          ].join(""),
        );
      }
      if (returnTypeResolutions.length > 1) {
        assert.fail(
          [
            "Type ",
            context.typeChecker.typeToString(returnType),
            " for ",
            resolver.name.getText(),
            " in ",
            ok(component.name).text,
            " cannot be resolved unambiguously",
          ].join(""),
        );
      }
      const [returnTypeResolution] = returnTypeResolutions;
      resolverTypeResolution.set(resolver, returnTypeResolution);
      for (const typeResolutionModule of getTypeResolutionModules(
        returnTypeResolution,
      )) {
        ok(componentModuleInstances.get(component)).push(typeResolutionModule);
      }
      for (const typeResolution of getTypeResolutionTypeResolutions(
        returnTypeResolution,
      )) {
        ok(componentTypeResolutions.get(component)).push(typeResolution);
      }
    }
  }
  return {
    resolverTypeResolution,
    componentModuleInstances,
    componentTypeResolutions,
  };
}

function* getTypeResolutions(
  context: Context,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  moduleTypeMap: WeakMap<ts.ClassDeclaration, WeakSet<ts.Type>>,
  type: ts.Type,
  level: number,
): Generator<TypeResolution> {
  if (moduleStack.length === 0) {
    return;
  }
  const module = ok(moduleStack.at(-1));
  if (!moduleTypeMap.has(module)) {
    moduleTypeMap.set(module, new WeakSet());
  }
  if (ok(moduleTypeMap.get(module)).has(type)) {
    return;
  }
  ok(moduleTypeMap.get(module)).add(type);
  const providers = ok(graph.moduleProviders.get(module));
  const importedModules = ok(graph.moduleImports.get(module));
  for (const provider of providers) {
    const returnType = ok(graph.providerReturnType.get(provider));
    if (returnType === type) {
      const parameterTypes = ok(graph.providerParameterTypes.get(provider));
      const parameterTypeResolutions: TypeResolution[] = [];
      for (const parameterType of parameterTypes) {
        const parameterTypeResolution = Array.from(
          getTypeResolutions(
            context,
            graph,
            moduleStack,
            moduleTypeMap,
            parameterType,
            level + 1,
          ),
        ).at(0);
        if (parameterTypeResolution === undefined) {
          console.log(
            [
              " ".repeat(level),
              "could not satisfy ",
              context.typeChecker.typeToString(parameterType),
              " for ",
              provider.name.getText(),
              " in ",
              ok(module.name).text,
            ].join(""),
          );
          break;
        }
        parameterTypeResolutions.push(parameterTypeResolution);
      }
      if (parameterTypes.length === parameterTypeResolutions.length) {
        yield {
          kind: "ProviderTypeResolution",
          type,
          module,
          provider,
          parameterTypeResolutions,
        };
      }
    }
  }
  if (type.symbol.getName() === "Set") {
    if (type.getFlags() & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;
      if (objectType.objectFlags & ts.ObjectFlags.Reference) {
        const typeReference = type as ts.TypeReference;
        const typeArguments =
          context.typeChecker.getTypeArguments(typeReference);
        if (typeArguments.length === 1) {
          const [typeArgument] = typeArguments;
          yield {
            kind: "SetTypeResolution",
            type,
            module,
            elementTypeResolutions: Array.from(
              getTypeResolutions(
                context,
                graph,
                moduleStack,
                moduleTypeMap,
                typeArgument,
                level + 1,
              ),
            ),
          };
        }
      }
    }
  }
  for (const importedModule of importedModules) {
    moduleStack.push(importedModule);
    yield* getTypeResolutions(
      context,
      graph,
      moduleStack,
      moduleTypeMap,
      type,
      level + 1,
    );
    moduleStack.pop();
  }
  moduleStack.pop();
  yield* getTypeResolutions(
    context,
    graph,
    moduleStack,
    moduleTypeMap,
    type,
    level + 1,
  );
  moduleStack.push(module);
  ok(moduleTypeMap.get(module)).delete(type);
}

function getTypeResolutionModules(
  typeResolution: TypeResolution,
): Set<ts.ClassDeclaration> {
  const modules = new Set<ts.ClassDeclaration>();
  modules.add(typeResolution.module);
  for (const childTypeResolution of getTypeResolutionChildTypeResolutions(
    typeResolution,
  )) {
    for (const descendantModules of getTypeResolutionModules(
      childTypeResolution,
    )) {
      modules.add(descendantModules);
    }
  }
  return modules;
}

function getTypeResolutionTypeResolutions(
  typeResolution: TypeResolution,
): Set<TypeResolution> {
  const typeResolutions = new Set<TypeResolution>();
  typeResolutions.add(typeResolution);
  for (const childTypeResolution of getTypeResolutionChildTypeResolutions(
    typeResolution,
  )) {
    for (const descendantTypeResolution of getTypeResolutionTypeResolutions(
      childTypeResolution,
    )) {
      typeResolutions.add(descendantTypeResolution);
    }
  }
  return typeResolutions;
}

function getTypeResolutionChildTypeResolutions(
  typeResolution: TypeResolution,
): TypeResolution[] {
  return typeResolution.kind === "ProviderTypeResolution"
    ? typeResolution.parameterTypeResolutions
    : typeResolution.elementTypeResolutions;
}

/**
 *
 */

function generateComponentImpl(
  context: Context,
  graph: Graph,
  graphResolution: GraphResolution,
  component: ts.ClassDeclaration,
): void {
  const { parsedCommandLine, factory } = context;
  const sourceFile = component.getSourceFile();
  const inputFileName = sourceFile.fileName;
  const outputFileName = path.join(
    path.dirname(inputFileName),
    "gen",
    path.basename(inputFileName),
  );
  const outputDirName = path.dirname(outputFileName);
  fs.mkdirSync(outputDirName, { recursive: true });
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });
  fs.writeFileSync(
    outputFileName,
    printer.printList(
      ts.ListFormat.MultiLine,
      factory.createNodeArray([
        ...buildImports(context, graph, component, outputFileName),
        buildComponentImpl(context, graph, graphResolution, component),
      ]),
      ts.createSourceFile(
        outputFileName,
        "",
        parsedCommandLine.options.target ?? ts.ScriptTarget.ES2022,
        false,
        ts.ScriptKind.TS,
      ),
    ),
  );
}

function buildImports(
  context: Context,
  graph: Graph,
  component: ts.ClassDeclaration,
  outputFileName: string,
): ts.ImportDeclaration[] {
  const { factory } = context;
  const [availableModules] = getComponentAvailableModules(
    context,
    graph,
    component,
  );
  return [component, ...availableModules].map((componentOrModule) => {
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

function buildComponentImpl(
  context: Context,
  graph: Graph,
  graphResolution: GraphResolution,
  component: ts.ClassDeclaration,
): ts.ClassDeclaration {
  const { factory } = context;
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
) {
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

function getComponentAvailableModules(
  context: Context,
  graph: Graph,
  component: ts.ClassDeclaration,
): [
  availableModules: ts.ClassDeclaration[],
  availableModuleParent: WeakMap<
    ts.ClassDeclaration,
    ts.ClassDeclaration | undefined
  >,
] {
  const module = graph.componentModule.get(component);
  assert.ok(module, "module");
  return getModuleAvailableModules(context, graph, module);
}

function getModuleAvailableModules(
  _context: Context,
  graph: Graph,
  module: ts.ClassDeclaration,
): [
  availableModules: ts.ClassDeclaration[],
  availableModuleParent: WeakMap<
    ts.ClassDeclaration,
    ts.ClassDeclaration | undefined
  >,
] {
  const availableModules: ts.ClassDeclaration[] = [];
  const availableModuleParent = new WeakMap<
    ts.ClassDeclaration,
    ts.ClassDeclaration | undefined
  >();
  const queue: ts.ClassDeclaration[] = [];
  const added = new WeakSet<ts.ClassDeclaration>();
  availableModuleParent.set(module, undefined);
  queue.push(module);
  added.add(module);
  while (true) {
    const element = queue.shift();
    if (element == undefined) {
      break;
    }
    availableModules.push(element);
    const nextElements = graph.moduleImports.get(element);
    if (nextElements === undefined) {
      continue;
    }
    for (const nextElement of nextElements) {
      if (!added.has(nextElement)) {
        availableModuleParent.set(nextElement, element);
        queue.push(nextElement);
        added.add(nextElement);
      }
    }
  }
  return [availableModules, availableModuleParent];
}

// function getTypeResolutions(
//   context: Context,
//   graph: Graph,
//   _component: ts.ClassDeclaration,
//   availableModuleParent: WeakMap<
//     ts.ClassDeclaration,
//     ts.ClassDeclaration | undefined
//   >,
//   module: ts.ClassDeclaration,
//   type: ts.Type,
// ): ts.PropertyDeclaration | ts.MethodDeclaration {
//   const { typeChecker } = context;
//   let currentModule: ts.ClassDeclaration | undefined = module;
//   while (currentModule !== undefined) {
//     const [availableModules] = getModuleAvailableModules(
//       context,
//       graph,
//       currentModule,
//     );
//     const candidateProviders: (
//       | ts.PropertyDeclaration
//       | ts.MethodDeclaration
//     )[] = [];
//     for (const availableModule of availableModules) {
//       const availableProviders = graph.moduleProviders.get(availableModule);
//       assert.ok(availableProviders, "availableProviders");
//       for (const availableProvider of availableProviders) {
//         const availableProviderReturnType =
//           graph.providerReturnType.get(availableProvider);
//         assert.ok(availableProviderReturnType, "availableProviderReturnType");
//         if (availableProviderReturnType === type) {
//           candidateProviders.push(availableProvider);
//         }
//       }
//     }
//     if (candidateProviders.length > 0) {
//       return candidateProviders[0];
//     }
//     currentModule = availableModuleParent.get(currentModule);
//   }
//   assert.ok(module.name, "module.name");
//   assert.fail(
//     "Could not resolve type " +
//       typeChecker.typeToString(type) +
//       " in module " +
//       module.name.text,
//   );
// }

/**
 *
 */

function ok<T>(x: T): NonNullable<T> {
  assert.ok(x);
  return x;
}

/**
 *
 */
main();
