#!/usr/bin/env node

import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

function main() {
  const context = buildContext();
  const graph = buildGraph(context);
  for (const component of graph.components) {
    generateComponentImpl(context, graph, component);
  }
}

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

interface Graph {
  components: ts.ClassDeclaration[];
  componentModule: WeakMap<ts.ClassDeclaration, ts.ClassDeclaration>;
  componentResolvers: WeakMap<ts.ClassDeclaration, ts.MethodDeclaration[]>;
  resolverReturnType: WeakMap<ts.MethodDeclaration, ts.Type>;
  modules: ts.ClassDeclaration[];
  moduleImports: WeakMap<ts.ClassDeclaration, ts.ClassDeclaration[]>;
  moduleProviders: WeakMap<ts.ClassDeclaration, ts.MethodDeclaration[]>;
  providerModule: WeakMap<ts.MethodDeclaration, ts.ClassDeclaration>;
  providerParameterTypes: WeakMap<ts.MethodDeclaration, ts.Type[]>;
  providerReturnType: WeakMap<ts.MethodDeclaration, ts.Type>;
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
    ts.MethodDeclaration[]
  >();
  for (const module of modules) {
    moduleImports.set(module, getModuleImports(context, module));
    moduleProviders.set(module, getModuleProviders(context, module));
  }
  const providerModule = new WeakMap<
    ts.MethodDeclaration,
    ts.ClassDeclaration
  >();
  const providerParameterTypes = new WeakMap<ts.MethodDeclaration, ts.Type[]>();
  const providerReturnType = new WeakMap<ts.MethodDeclaration, ts.Type>();
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
  _context: Context,
  module: ts.ClassDeclaration,
): ts.MethodDeclaration[] {
  return module.members.filter(ts.isMethodDeclaration);
}

function getProviderParameterTypes(
  context: Context,
  provider: ts.MethodDeclaration,
): ts.Type[] {
  const { typeChecker } = context;
  return provider.parameters
    .map((parameter) => parameter.type)
    .filter(isNotUndefined)
    .map(typeChecker.getTypeAtLocation);
}

function getResolverReturnType(
  context: Context,
  resolve: ts.MethodDeclaration,
): ts.Type {
  const { typeChecker } = context;
  const typeNode = resolve.type;
  assert.ok(typeNode, "typeNode");
  return typeChecker.getTypeAtLocation(typeNode);
}

function getProviderReturnType(
  context: Context,
  provider: ts.MethodDeclaration,
): ts.Type {
  const { typeChecker } = context;
  const typeNode = provider.type;
  assert.ok(typeNode, "typeNode");
  return typeChecker.getTypeAtLocation(typeNode);
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

function generateComponentImpl(
  context: Context,
  graph: Graph,
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
        buildComponentImpl(context, graph, component),
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
  component: ts.ClassDeclaration,
): ts.ClassDeclaration {
  const { factory } = context;
  assert.ok(component.name, "component.name");
  const resolvers = graph.componentResolvers.get(component);
  assert.ok(resolvers, "resolvers");
  const [availableModules, availableModuleParent] =
    getComponentAvailableModules(context, graph, component);
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
        const resolvedProvider = resolveType(
          context,
          graph,
          component,
          availableModuleParent,
          module,
          resolverReturnType,
        );
        const resolvedModule = graph.providerModule.get(resolvedProvider);
        assert.ok(resolvedModule, "resolvedModule");
        assert.ok(resolvedModule.name, "resolvedModule.name");
        assert.ok(
          ts.isIdentifier(resolvedProvider.name),
          "ts.isIdentifier(resolvedProvider.name)",
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
                      "_" +
                        resolvedModule.name.text +
                        "_" +
                        resolvedProvider.name.text,
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
      ...availableModules.map((module) => {
        assert.ok(module.name, "module.name");
        return factory.createPropertyDeclaration(
          [factory.createToken(ts.SyntaxKind.PrivateKeyword)],
          factory.createIdentifier("_" + module.name.text),
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
            ...availableModules.map((module) => {
              assert.ok(module.name, "module.name");
              return factory.createExpressionStatement(
                factory.createBinaryExpression(
                  factory.createPropertyAccessExpression(
                    factory.createThis(),
                    factory.createIdentifier("_" + module.name.text),
                  ),
                  factory.createToken(ts.SyntaxKind.EqualsToken),
                  factory.createNewExpression(
                    factory.createIdentifier(module.name.text),
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
      ...availableModules.flatMap((module) => {
        const providers = graph.moduleProviders.get(module);
        assert.ok(providers, "providers");
        return providers.map((provider) => {
          assert.ok(module.name, "module.name");
          assert.ok(
            ts.isIdentifier(provider.name),
            "ts.isIdentifier(provider.name)",
          );
          const parameterTypes = graph.providerParameterTypes.get(provider);
          assert.ok(parameterTypes, "parameterTypes");
          return factory.createMethodDeclaration(
            [factory.createToken(ts.SyntaxKind.PrivateKeyword)],
            undefined,
            factory.createIdentifier(
              "_" + module.name.text + "_" + provider.name.text,
            ),
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
                        factory.createIdentifier("_" + module.name.text),
                      ),
                      factory.createIdentifier(provider.name.text),
                    ),
                    undefined,
                    [
                      ...parameterTypes.map((parameterType) => {
                        const resolvedProvider = resolveType(
                          context,
                          graph,
                          component,
                          availableModuleParent,
                          module,
                          parameterType,
                        );
                        const resolvedModule =
                          graph.providerModule.get(resolvedProvider);
                        assert.ok(resolvedModule, "resolvedModule");
                        assert.ok(resolvedModule.name, "resolvedModule.name");
                        assert.ok(
                          ts.isIdentifier(resolvedProvider.name),
                          "ts.isIdentifier(resolvedProvider.name)",
                        );
                        return factory.createCallExpression(
                          factory.createPropertyAccessExpression(
                            factory.createThis(),
                            factory.createIdentifier(
                              "_" +
                                resolvedModule.name.text +
                                "_" +
                                resolvedProvider.name.text,
                            ),
                          ),
                          undefined,
                          [],
                        );
                      }),
                    ],
                  ),
                ),
              ],
              true,
            ),
          );
        });
      }),
    ],
  );
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

function resolveType(
  context: Context,
  graph: Graph,
  _component: ts.ClassDeclaration,
  availableModuleParent: WeakMap<
    ts.ClassDeclaration,
    ts.ClassDeclaration | undefined
  >,
  module: ts.ClassDeclaration,
  type: ts.Type,
): ts.MethodDeclaration {
  const { typeChecker } = context;
  let currentModule: ts.ClassDeclaration | undefined = module;
  while (currentModule !== undefined) {
    const [availableModules] = getModuleAvailableModules(
      context,
      graph,
      currentModule,
    );
    const candidateProviders: ts.MethodDeclaration[] = [];
    for (const availableModule of availableModules) {
      const availableProviders = graph.moduleProviders.get(availableModule);
      assert.ok(
        availableProviders,
        "availableProviders " + availableModule.name?.text,
      );
      for (const availableProvider of availableProviders) {
        const availableProviderReturnType =
          graph.providerReturnType.get(availableProvider);
        assert.ok(availableProviderReturnType, "availableProviderReturnType");
        if (availableProviderReturnType === type) {
          candidateProviders.push(availableProvider);
        }
      }
    }
    if (candidateProviders.length > 0) {
      return candidateProviders[0];
    }
    currentModule = availableModuleParent.get(currentModule);
  }
  assert.ok(module.name, "module.name");
  assert.fail(
    "Could not resolve type " +
      typeChecker.typeToString(type) +
      " in module " +
      module.name.text,
  );
}

/**
 *
 */
main();
