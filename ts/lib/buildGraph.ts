import assert from "node:assert/strict";
import ts from "typescript";
import { orThrow } from "./orThrow.js";

export interface Graph {
  components: ts.ClassDeclaration[];
  componentModule: Map<ts.ClassDeclaration, ts.ClassDeclaration>;
  componentResolvers: Map<ts.ClassDeclaration, ts.MethodDeclaration[]>;
  resolverReturnType: Map<ts.MethodDeclaration, ts.Type>;
  modules: ts.ClassDeclaration[];
  moduleIncludedModules: Map<ts.ClassDeclaration, ts.ClassDeclaration[]>;
  moduleRequiredTypes: Map<ts.ClassDeclaration, Set<ts.Type>>;
  moduleProviders: Map<
    ts.ClassDeclaration,
    (ts.PropertyDeclaration | ts.MethodDeclaration)[]
  >;
  providerModule: Map<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.ClassDeclaration
  >;
  providerParameterTypes: Map<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.Type[]
  >;
  providerReturnType: Map<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.Type
  >;
}

export function buildGraph(program: ts.Program): Graph {
  const components = getComponents(program);
  const modules = getModules(program);
  const componentModule = new Map<ts.ClassDeclaration, ts.ClassDeclaration>();
  const componentResolvers = new Map<
    ts.ClassDeclaration,
    ts.MethodDeclaration[]
  >();
  for (const component of components) {
    componentModule.set(component, getComponentModule(program, component));
    componentResolvers.set(
      component,
      getComponentResolvers(program, component),
    );
  }
  const resolverReturnType = new Map<ts.MethodDeclaration, ts.Type>();
  for (const component of components) {
    const resolvers = componentResolvers.get(component);
    assert.ok(resolvers, "resolvers");
    for (const resolver of resolvers) {
      resolverReturnType.set(
        resolver,
        getResolverReturnType(program, resolver),
      );
    }
  }
  const moduleIncludedModules = new Map<
    ts.ClassDeclaration,
    ts.ClassDeclaration[]
  >();
  const moduleRequiredTypes = new Map<ts.ClassDeclaration, Set<ts.Type>>();
  const moduleProviders = new Map<
    ts.ClassDeclaration,
    (ts.PropertyDeclaration | ts.MethodDeclaration)[]
  >();
  for (const module of modules) {
    moduleIncludedModules.set(
      module,
      getModuleIncludedModules(program, module),
    );
    moduleRequiredTypes.set(module, getModuleRequiredTypes(program, module));
    moduleProviders.set(module, getModuleProviders(program, module));
  }
  const providerModule = new Map<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.ClassDeclaration
  >();
  const providerParameterTypes = new Map<
    ts.PropertyDeclaration | ts.MethodDeclaration,
    ts.Type[]
  >();
  const providerReturnType = new Map<
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
        getProviderParameterTypes(program, provider),
      );
      providerReturnType.set(
        provider,
        getProviderReturnType(program, provider),
      );
    }
  }
  return {
    components,
    componentModule,
    componentResolvers,
    resolverReturnType,
    modules,
    moduleIncludedModules,
    moduleRequiredTypes,
    moduleProviders,
    providerModule,
    providerParameterTypes,
    providerReturnType,
  };
}

/**
 *
 */
function getComponents(program: ts.Program): ts.ClassDeclaration[] {
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
    classDeclaration.heritageClauses.some((heritageClause) => {
      if (
        heritageClause.token === ts.SyntaxKind.ExtendsKeyword &&
        heritageClause.types.length === 1
      ) {
        const expressionWithTypeArguments = orThrow(heritageClause.types.at(0));
        return (
          ts.isPropertyAccessExpression(
            expressionWithTypeArguments.expression,
          ) &&
          ts.isIdentifier(expressionWithTypeArguments.expression.expression) &&
          expressionWithTypeArguments.expression.expression.text === "Jagger" &&
          ts.isIdentifier(expressionWithTypeArguments.expression.name) &&
          expressionWithTypeArguments.expression.name.text === "Component"
        );
      }
      return false;
    })
  );
}

function getModules(program: ts.Program): ts.ClassDeclaration[] {
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
    classDeclaration.heritageClauses.some((heritageClause) => {
      if (
        heritageClause.token === ts.SyntaxKind.ExtendsKeyword &&
        heritageClause.types.length === 1
      ) {
        const expressionWithTypeArguments = orThrow(heritageClause.types.at(0));
        return (
          ts.isPropertyAccessExpression(
            expressionWithTypeArguments.expression,
          ) &&
          ts.isIdentifier(expressionWithTypeArguments.expression.expression) &&
          expressionWithTypeArguments.expression.expression.text === "Jagger" &&
          ts.isIdentifier(expressionWithTypeArguments.expression.name) &&
          expressionWithTypeArguments.expression.name.text === "Module"
        );
      }
      return false;
    })
  );
}

function getComponentModule(
  program: ts.Program,
  component: ts.ClassDeclaration,
): ts.ClassDeclaration {
  const typeChecker = program.getTypeChecker();
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
  _program: ts.Program,
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

function getModuleIncludedModules(
  program: ts.Program,
  module: ts.ClassDeclaration,
): ts.ClassDeclaration[] {
  const typeChecker = program.getTypeChecker();
  return module.members
    .filter(ts.isPropertyDeclaration)
    .filter(
      (propertyDeclaration) =>
        propertyDeclaration.modifiers !== undefined &&
        propertyDeclaration.modifiers.some(
          (modifierLike) => modifierLike.kind === ts.SyntaxKind.StaticKeyword,
        ) &&
        ts.isIdentifier(propertyDeclaration.name) &&
        propertyDeclaration.name.text === "includes",
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

function getModuleRequiredTypes(
  program: ts.Program,
  module: ts.ClassDeclaration,
): Set<ts.Type> {
  const typeChecker = program.getTypeChecker();
  const types = module.members
    .filter(ts.isPropertyDeclaration)
    .filter(
      (propertyDeclaration) =>
        propertyDeclaration.modifiers !== undefined &&
        propertyDeclaration.modifiers.some(
          (modifierLike) => modifierLike.kind === ts.SyntaxKind.StaticKeyword,
        ) &&
        ts.isIdentifier(propertyDeclaration.name) &&
        propertyDeclaration.name.text === "requires",
    )
    .map((propertyDeclaration) => propertyDeclaration.type)
    .filter(isNotUndefined)
    .map(typeChecker.getTypeAtLocation)
    .flatMap((type) => {
      if (type.getFlags() & ts.TypeFlags.Object) {
        const objectType = type as ts.ObjectType;
        if (objectType.objectFlags & ts.ObjectFlags.Reference) {
          const typeReference = type as ts.TypeReference;
          const typeArguments = typeChecker.getTypeArguments(typeReference);
          return typeArguments;
        }
      }
      return [];
    });
  return new Set(types);
}

function getModuleProviders(
  program: ts.Program,
  module: ts.ClassDeclaration,
): (ts.PropertyDeclaration | ts.MethodDeclaration)[] {
  const typeChecker = program.getTypeChecker();
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
  program: ts.Program,
  provider: ts.PropertyDeclaration | ts.MethodDeclaration,
): ts.Type[] {
  const typeChecker = program.getTypeChecker();
  if (ts.isPropertyDeclaration(provider)) {
    const signatures = typeChecker
      .getTypeAtLocation(provider)
      .getCallSignatures();
    assert.ok(signatures.length === 1, "signatures.length === 1");
    const signature = orThrow(signatures.at(0));
    const parameterSymbols = signature.getParameters();
    const parameterDeclarations = signature.getDeclaration().parameters;
    assert.ok(
      parameterSymbols.length === parameterDeclarations.length,
      "parameterSymbols.length === parameterDeclarations.length",
    );
    return parameterSymbols.flatMap((parameterSymbol, index) => {
      const type = typeChecker.getTypeOfSymbol(parameterSymbol);
      const parameterDeclaration = orThrow(parameterDeclarations[index]);
      if (parameterDeclaration.dotDotDotToken !== undefined) {
        if (type.getFlags() & ts.TypeFlags.Object) {
          const objectType = type as ts.ObjectType;
          if (objectType.objectFlags & ts.ObjectFlags.Reference) {
            const typeReference = type as ts.TypeReference;
            const typeArguments = typeChecker.getTypeArguments(typeReference);
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
  program: ts.Program,
  resolver: ts.MethodDeclaration,
): ts.Type {
  const typeChecker = program.getTypeChecker();
  const typeNode = resolver.type;
  assert.ok(typeNode, "typeNode");
  return typeChecker.getTypeAtLocation(typeNode);
}

function getProviderReturnType(
  program: ts.Program,
  provider: ts.PropertyDeclaration | ts.MethodDeclaration,
): ts.Type {
  const typeChecker = program.getTypeChecker();
  if (ts.isPropertyDeclaration(provider)) {
    const signatures = typeChecker
      .getTypeAtLocation(provider)
      .getCallSignatures();
    assert.ok(signatures.length === 1, "signatures.length === 1");
    const signature = orThrow(signatures.at(0));
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

function isNotUndefined<T extends NonNullable<unknown>>(
  x: T | undefined,
): x is T {
  return x !== undefined;
}
