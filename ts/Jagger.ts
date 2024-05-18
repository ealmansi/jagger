export namespace Jagger {
  export abstract class Module {}

  export abstract class Component {}

  export interface Provider<Params extends any[], Type> {
    (...args: Params): Type;
  }

  export function instance<Class extends new (...args: any) => any>(
    klass: Class,
  ): Provider<ConstructorParameters<Class>, InstanceType<Class>> {
    return function (
      ...args: ConstructorParameters<Class>
    ): InstanceType<Class> {
      return new klass(...args);
    };
  }

  export function as<SubType extends Type, Type>(): Provider<[SubType], Type> {
    return function (value: SubType): Type {
      return value;
    };
  }

  export function array<Values extends Type[], Type>(): Provider<
    Values,
    Type[]
  > {
    return function (...values: Values): Type[] {
      return values;
    };
  }
}
