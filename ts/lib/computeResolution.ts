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
}

interface SetTypeResolution {
  kind: "SetTypeResolution";
  type: ts.Type;
  module: ts.ClassDeclaration;
  elementTypeResolutions: TypeResolution[];
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
      const moduleUnresolvedTypes = new Map<
        ts.ClassDeclaration,
        Set<ts.Type>
      >();
      const returnTypeResolutions = Array.from(
        getTypeResolutions(
          typeChecker,
          graph,
          moduleStack,
          returnType,
          moduleUnresolvedTypes,
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
  moduleUnresolvedTypes: Map<ts.ClassDeclaration, Set<ts.Type>>,
): Generator<TypeResolution> {
  if (moduleStack.length === 0) {
    return;
  }
  const module = orThrow(moduleStack.at(-1));
  if (!moduleUnresolvedTypes.has(module)) {
    moduleUnresolvedTypes.set(module, new Set());
  }
  const unresolvedTypes = orThrow(moduleUnresolvedTypes.get(module));
  if (unresolvedTypes.has(type)) {
    return;
  }
  unresolvedTypes.add(type);
  using _ = {
    [Symbol.dispose]: () => {
      unresolvedTypes.delete(type);
      if (unresolvedTypes.size === 0) {
        moduleUnresolvedTypes.delete(module);
      }
    },
  };
  yield* getProviderTypeResolutions(
    typeChecker,
    graph,
    moduleStack,
    type,
    moduleUnresolvedTypes,
  );
  yield* getSetTypeResolutions(
    typeChecker,
    graph,
    moduleStack,
    type,
    moduleUnresolvedTypes,
  );
  yield* getImportedTypeResolutions(
    typeChecker,
    graph,
    moduleStack,
    type,
    moduleUnresolvedTypes,
  );
  yield* getParentTypeResolutions(
    typeChecker,
    graph,
    moduleStack,
    type,
    moduleUnresolvedTypes,
  );
}

function* getProviderTypeResolutions(
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  moduleUnresolvedTypes: Map<ts.ClassDeclaration, Set<ts.Type>>,
): Generator<TypeResolution> {
  const module = orThrow(moduleStack.at(-1));
  const providers = orThrow(graph.moduleProviders.get(module));
  for (const provider of providers) {
    const returnType = orThrow(graph.providerReturnType.get(provider));
    if (!typesAreConsideredEqual(typeChecker, returnType, type)) {
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
          moduleUnresolvedTypes,
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
    };
  }
}

function* getSetTypeResolutions(
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  moduleUnresolvedTypes: Map<ts.ClassDeclaration, Set<ts.Type>>,
): Generator<TypeResolution> {
  const module = orThrow(moduleStack.at(-1));
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
      moduleUnresolvedTypes,
    ),
  );
  yield {
    kind: "SetTypeResolution",
    type,
    module,
    elementTypeResolutions,
  };
}

function* getImportedTypeResolutions(
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  moduleUnresolvedTypes: Map<ts.ClassDeclaration, Set<ts.Type>>,
): Generator<TypeResolution> {
  const module = orThrow(moduleStack.at(-1));
  const importedModules = orThrow(graph.moduleImports.get(module));
  for (const importedModule of importedModules) {
    moduleStack.push(importedModule);
    yield* getTypeResolutions(
      typeChecker,
      graph,
      moduleStack,
      type,
      moduleUnresolvedTypes,
    );
    moduleStack.pop();
  }
}

function* getParentTypeResolutions(
  typeChecker: ts.TypeChecker,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  type: ts.Type,
  moduleUnresolvedTypes: Map<ts.ClassDeclaration, Set<ts.Type>>,
): Generator<TypeResolution> {
  const module = orThrow(moduleStack.at(-1));
  moduleStack.pop();
  yield* getTypeResolutions(
    typeChecker,
    graph,
    moduleStack,
    type,
    moduleUnresolvedTypes,
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
