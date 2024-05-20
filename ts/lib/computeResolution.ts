import ts from "typescript";
import assert from "node:assert/strict";
import { orThrow } from "./orThrow.js";
import { Graph } from "./buildGraph.js";

export interface Resolution {
  resolverTypeResolution: Map<ts.MethodDeclaration, TypeResolution>;
  componentModuleInstances: Map<ts.ClassDeclaration, ts.ClassDeclaration[]>;
  componentTypeResolutions: Map<ts.ClassDeclaration, TypeResolution[]>;
}

export type TypeResolution = ProviderTypeResolution | SetTypeResolution;

interface ProviderTypeResolution {
  kind: "ProviderTypeResolution";
  type: ts.Type;
  module: ts.ClassDeclaration;
  provider: ts.PropertyDeclaration | ts.MethodDeclaration;
  parameterTypeResolutions: TypeResolution[];
  requiresAsync: boolean;
}

interface SetTypeResolution {
  kind: "SetTypeResolution";
  type: ts.Type;
  module: ts.ClassDeclaration;
  elementTypeResolutions: TypeResolution[];
  requiresAsync: boolean;
}

export function buildResolution(
  typeChecker: ts.TypeChecker,
  graph: Graph,
): Resolution {
  const resolverTypeResolution = new Map<
    ts.MethodDeclaration,
    TypeResolution
  >();
  const componentModuleInstances = new Map<
    ts.ClassDeclaration,
    ts.ClassDeclaration[]
  >();
  const componentModuleInstancesSet = new Map<
    ts.ClassDeclaration,
    Set<ts.ClassDeclaration>
  >();
  const componentTypeResolutions = new Map<
    ts.ClassDeclaration,
    TypeResolution[]
  >();
  for (const component of graph.components) {
    componentModuleInstances.set(component, []);
    componentModuleInstancesSet.set(component, new Set());
    componentTypeResolutions.set(component, []);
    const module = orThrow(graph.componentModule.get(component));
    const resolvers = orThrow(graph.componentResolvers.get(component));
    for (const resolver of resolvers) {
      const returnType = orThrow(graph.resolverReturnType.get(resolver));
      const moduleStack = [module];
      const recursionGuard = new Map<ts.ClassDeclaration, Set<ts.Type>>();
      const returnTypeResolutions = Array.from(
        getTypeResolutions(
          typeChecker,
          graph,
          moduleStack,
          returnType,
          recursionGuard,
        ),
      );
      if (returnTypeResolutions.length === 0) {
        assert.fail(
          [
            "Failed to resolve type ",
            typeChecker.typeToString(returnType),
            " for ",
            resolver.name.getText(),
            " in ",
            orThrow(component.name).text,
          ].join(""),
        );
      }
      if (returnTypeResolutions.length > 1) {
        assert.fail(
          [
            "Type ",
            typeChecker.typeToString(returnType),
            " for ",
            resolver.name.getText(),
            " in ",
            orThrow(component.name).text,
            " cannot be resolved unambiguously",
          ].join(""),
        );
      }
      const returnTypeResolution = orThrow(returnTypeResolutions.at(0));
      if (
        returnTypeResolution.requiresAsync &&
        returnType === getAwaitedType(typeChecker, returnType)
      ) {
        assert.fail(
          [
            "Type ",
            typeChecker.typeToString(returnType),
            " for ",
            resolver.name.getText(),
            " in ",
            orThrow(component.name).text,
            " cannot be resolved synchronously",
          ].join(""),
        );
      }
      resolverTypeResolution.set(resolver, returnTypeResolution);
      const moduleInstancesSet = orThrow(
        componentModuleInstancesSet.get(component),
      );
      const moduleInstances = orThrow(componentModuleInstances.get(component));
      for (const typeResolutionModule of getTypeResolutionModules(
        returnTypeResolution,
      )) {
        if (moduleInstancesSet.has(typeResolutionModule)) {
          continue;
        }
        moduleInstancesSet.add(typeResolutionModule);
        moduleInstances.push(typeResolutionModule);
      }
      for (const typeResolution of getTypeResolutionTypeResolutions(
        returnTypeResolution,
      )) {
        orThrow(componentTypeResolutions.get(component)).push(typeResolution);
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
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  recursionGuard: RecursionGuard,
): Generator<TypeResolution> {
  if (moduleStack.length === 0) {
    return;
  }
  const module = orThrow(moduleStack.at(-1));
  yield* withRecursionGuard(module, type, recursionGuard, function* () {
    yield* getProviderTypeResolutions(
      typeChecker,
      graph,
      moduleStack,
      type,
      recursionGuard,
      module,
    );
    yield* getSetTypeResolutions(
      typeChecker,
      graph,
      moduleStack,
      type,
      recursionGuard,
      module,
    );
    yield* getImportedTypeResolutions(
      typeChecker,
      graph,
      moduleStack,
      type,
      recursionGuard,
      module,
    );
    yield* getParentTypeResolutions(
      typeChecker,
      graph,
      moduleStack,
      type,
      recursionGuard,
      module,
    );
  });
}

type RecursionGuard = Map<ts.ClassDeclaration, Set<ts.Type>>;

function* withRecursionGuard(
  module: ts.ClassDeclaration,
  type: ts.Type,
  recursionGuard: RecursionGuard,
  handler: () => Generator<TypeResolution>,
): Generator<TypeResolution> {
  if (!recursionGuard.has(module)) {
    recursionGuard.set(module, new Set());
  }
  const pendingTypes = orThrow(recursionGuard.get(module));
  if (pendingTypes.has(type)) {
    return;
  }
  pendingTypes.add(type);
  try {
    yield* handler();
  } finally {
    pendingTypes.delete(type);
    if (pendingTypes.size === 0) {
      recursionGuard.delete(module);
    }
  }
}

function* getProviderTypeResolutions(
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  recursionGuard: RecursionGuard,
  module: ts.ClassDeclaration,
): Generator<TypeResolution> {
  const providers = orThrow(graph.moduleProviders.get(module));
  const awaitedType = getAwaitedType(typeChecker, type);
  for (const provider of providers) {
    const returnType = orThrow(graph.providerReturnType.get(provider));
    const awaitedReturnType = getAwaitedType(typeChecker, returnType);
    if (
      !typesAreConsideredEqual(typeChecker, returnType, type) &&
      !typesAreConsideredEqual(typeChecker, returnType, awaitedType) &&
      !typesAreConsideredEqual(typeChecker, awaitedReturnType, type)
    ) {
      continue;
    }
    const parameterTypes = orThrow(graph.providerParameterTypes.get(provider));
    const parameterTypeResolutions: TypeResolution[] = [];
    for (const parameterType of parameterTypes) {
      const typeResolutions = Array.from(
        getTypeResolutions(
          typeChecker,
          graph,
          moduleStack,
          parameterType,
          recursionGuard,
        ),
      );
      if (typeResolutions.length === 0) {
        console.log(
          [
            "could not satisfy ",
            typeChecker.typeToString(parameterType),
            " for ",
            provider.name.getText(),
            " in ",
            orThrow(module.name).text,
          ].join(""),
        );
        break;
      }
      const typeResolution = orThrow(typeResolutions.at(0));
      parameterTypeResolutions.push(typeResolution);
    }
    if (parameterTypes.length !== parameterTypeResolutions.length) {
      continue;
    }
    yield {
      kind: "ProviderTypeResolution",
      type,
      module,
      provider,
      parameterTypeResolutions,
      requiresAsync:
        returnType !== awaitedReturnType ||
        parameterTypeResolutions.some(
          (parameterTypeResolution) => parameterTypeResolution.requiresAsync,
        ),
    };
  }
}

function getAwaitedType(typeChecker: ts.TypeChecker, type: ts.Type): ts.Type {
  const typeSymbol = type.getSymbol();
  if (typeSymbol === undefined) {
    return type;
  }
  if (typeSymbol.getName() !== "Promise") {
    return type;
  }
  if ((type.getFlags() & ts.TypeFlags.Object) === 0) {
    return type;
  }
  const objectType = type as ts.ObjectType;
  if ((objectType.objectFlags & ts.ObjectFlags.Reference) === 0) {
    return type;
  }
  const typeReference = type as ts.TypeReference;
  const typeArguments = typeChecker.getTypeArguments(typeReference);
  if (typeArguments.length !== 1) {
    return type;
  }
  const typeArgument = orThrow(typeArguments.at(0));
  return typeArgument;
}

function* getSetTypeResolutions(
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  recursionGuard: RecursionGuard,
  module: ts.ClassDeclaration,
): Generator<TypeResolution> {
  const typeSymbol = type.getSymbol();
  if (typeSymbol === undefined) {
    return;
  }
  if (typeSymbol.getName() !== "Set") {
    return;
  }
  if ((type.getFlags() & ts.TypeFlags.Object) === 0) {
    return;
  }
  const objectType = type as ts.ObjectType;
  if ((objectType.objectFlags & ts.ObjectFlags.Reference) === 0) {
    return;
  }
  const typeReference = type as ts.TypeReference;
  const typeArguments = typeChecker.getTypeArguments(typeReference);
  if (typeArguments.length !== 1) {
    return;
  }
  const typeArgument = orThrow(typeArguments.at(0));
  const elementTypeResolutions = Array.from(
    getTypeResolutions(
      typeChecker,
      graph,
      moduleStack,
      typeArgument,
      recursionGuard,
    ),
  );
  yield {
    kind: "SetTypeResolution",
    type,
    module,
    elementTypeResolutions,
    requiresAsync: elementTypeResolutions.some(
      (elementTypeResolution) => elementTypeResolution.requiresAsync,
    ),
  };
}

function* getImportedTypeResolutions(
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  recursionGuard: RecursionGuard,
  module: ts.ClassDeclaration,
): Generator<TypeResolution> {
  const includedModules = orThrow(graph.moduleIncludedModules.get(module));
  for (const includedModule of includedModules) {
    moduleStack.push(includedModule);
    yield* getTypeResolutions(
      typeChecker,
      graph,
      moduleStack,
      type,
      recursionGuard,
    );
    moduleStack.pop();
  }
}

function* getParentTypeResolutions(
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  recursionGuard: RecursionGuard,
  module: ts.ClassDeclaration,
): Generator<TypeResolution> {
  const requiredTypes = orThrow(graph.moduleRequiredTypes.get(module));
  if (!requiredTypes.has(type)) {
    return;
  }
  moduleStack.pop();
  yield* getTypeResolutions(
    typeChecker,
    graph,
    moduleStack,
    type,
    recursionGuard,
  );
  moduleStack.push(module);
}

function typesAreConsideredEqual(
  typeChecker: ts.TypeChecker,
  typeA: ts.Type,
  typeB: ts.Type,
): boolean {
  if (typeA === typeB) {
    return true;
  }
  const symbolA = typeA.getSymbol();
  const symbolB = typeB.getSymbol();
  if (
    symbolA !== undefined &&
    symbolB !== undefined &&
    symbolA.getName() === symbolB.getName()
  ) {
    let objectFlagsA: ts.ObjectFlags | undefined;
    if (typeA.getFlags() & ts.TypeFlags.Object) {
      const objectTypeA = typeA as ts.ObjectType;
      objectFlagsA = objectTypeA.objectFlags;
    }
    let objectFlagsB: ts.ObjectFlags | undefined;
    if (typeB.getFlags() & ts.TypeFlags.Object) {
      const objectTypeB = typeB as ts.ObjectType;
      objectFlagsB = objectTypeB.objectFlags;
    }
    const typeArgumentsA = getTypeArguments(typeChecker, typeA) ?? [];
    const typeArgumentsB = getTypeArguments(typeChecker, typeB) ?? [];
    return (
      objectFlagsA === objectFlagsB &&
      typeArgumentsA.length === typeArgumentsB.length &&
      typeArgumentsA.every((typeArgumentA, index) =>
        typesAreConsideredEqual(
          typeChecker,
          typeArgumentA,
          orThrow(typeArgumentsB.at(index)),
        ),
      )
    );
  }
  for (const type of [typeA, typeB]) {
    if ((type.getFlags() & ts.TypeFlags.Any) !== 0) {
      return false;
    }
    if ((type.getFlags() & ts.TypeFlags.EnumLike) !== 0) {
      return false;
    }
    if (
      (type.getFlags() & ts.TypeFlags.Object) !== 0 &&
      ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Class) !== 0
    ) {
      return false;
    }
  }
  return (
    typeChecker.isTypeAssignableTo(typeA, typeB) &&
    typeChecker.isTypeAssignableTo(typeB, typeA)
  );
}

function getTypeArguments(
  typeChecker: ts.TypeChecker,
  type: ts.Type,
): readonly ts.Type[] | undefined {
  if (type.getFlags() & ts.TypeFlags.Object) {
    const objectType = type as ts.ObjectType;
    if (objectType.objectFlags & ts.ObjectFlags.Reference) {
      const typeReference = type as ts.TypeReference;
      const typeArguments = typeChecker.getTypeArguments(typeReference);
      return typeArguments;
    }
  }
  return undefined;
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
