import ts from "typescript";
import assert from "node:assert/strict";
import { ok } from "./ok.js";
import { Graph } from "./buildGraph.js";

export interface GraphResolution {
  resolverTypeResolution: WeakMap<ts.MethodDeclaration, TypeResolution>;
  componentModuleInstances: WeakMap<ts.ClassDeclaration, ts.ClassDeclaration[]>;
  componentTypeResolutions: WeakMap<ts.ClassDeclaration, TypeResolution[]>;
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

export function buildGraphResolution(
  program: ts.Program,
  graph: Graph,
): GraphResolution {
  const typeChecker = program.getTypeChecker();
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
          program,
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
            ok(component.name).text,
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
            ok(component.name).text,
            " cannot be resolved unambiguously",
          ].join(""),
        );
      }
      const returnTypeResolution = ok(returnTypeResolutions.at(0));
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
  program: ts.Program,
  graph: Graph,
  moduleStack: ts.ClassDeclaration[],
  moduleTypeMap: WeakMap<ts.ClassDeclaration, WeakSet<ts.Type>>,
  type: ts.Type,
  level: number,
): Generator<TypeResolution> {
  const typeChecker = program.getTypeChecker();
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
            program,
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
              typeChecker.typeToString(parameterType),
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
        const typeArguments = typeChecker.getTypeArguments(typeReference);
        if (typeArguments.length === 1) {
          const typeArgument = ok(typeArguments.at(0));
          yield {
            kind: "SetTypeResolution",
            type,
            module,
            elementTypeResolutions: Array.from(
              getTypeResolutions(
                program,
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
      program,
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
    program,
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
