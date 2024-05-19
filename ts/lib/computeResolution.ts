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
      const moduleTypeMap = new Map<ts.ClassDeclaration, WeakSet<ts.Type>>();
      const returnTypeResolutions = Array.from(
        getTypeResolutions(
          typeChecker,
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
  moduleTypeMap: Map<ts.ClassDeclaration, WeakSet<ts.Type>>,
  type: ts.Type,
  level: number,
): Generator<TypeResolution> {
  if (moduleStack.length === 0) {
    return;
  }
  const module = orThrow(moduleStack.at(-1));
  if (!moduleTypeMap.has(module)) {
    moduleTypeMap.set(module, new WeakSet());
  }
  if (orThrow(moduleTypeMap.get(module)).has(type)) {
    return;
  }
  orThrow(moduleTypeMap.get(module)).add(type);
  using _ = {
    [Symbol.dispose]: () => {
      orThrow(moduleTypeMap.get(module)).delete(type);
    },
  };
  const providers = orThrow(graph.moduleProviders.get(module));
  const importedModules = orThrow(graph.moduleImports.get(module));
  for (const provider of providers) {
    const returnType = orThrow(graph.providerReturnType.get(provider));
    if (typesAreConsideredEqual(typeChecker, returnType, type)) {
      const parameterTypes = orThrow(
        graph.providerParameterTypes.get(provider),
      );
      const parameterTypeResolutions: TypeResolution[] = [];
      for (const parameterType of parameterTypes) {
        const typeResolutions = Array.from(
          getTypeResolutions(
            typeChecker,
            graph,
            moduleStack,
            moduleTypeMap,
            parameterType,
            level + 1,
          ),
        );
        if (typeResolutions.length === 0) {
          console.log(
            [
              " ".repeat(level),
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
  const typeSymbol = type.getSymbol();
  if (typeSymbol !== undefined && typeSymbol.getName() === "Set") {
    if (type.getFlags() & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;
      if (objectType.objectFlags & ts.ObjectFlags.Reference) {
        const typeReference = type as ts.TypeReference;
        const typeArguments = typeChecker.getTypeArguments(typeReference);
        if (typeArguments.length === 1) {
          const typeArgument = orThrow(typeArguments.at(0));
          yield {
            kind: "SetTypeResolution",
            type,
            module,
            elementTypeResolutions: Array.from(
              getTypeResolutions(
                typeChecker,
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
      typeChecker,
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
    typeChecker,
    graph,
    moduleStack,
    moduleTypeMap,
    type,
    level + 1,
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
