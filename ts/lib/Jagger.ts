export namespace Jagger {
  export abstract class Module {}

  export abstract class Component {}

  export interface Provider<Params extends any[], Type> {
    (...args: Params): Type;
  }

  export function instance<Class extends new (...args: any) => any>(
    klass: Class,
  ): {
    (...args: ConstructorParameters<Class>): InstanceType<Class>;
  } {
    return function (
      ...args: ConstructorParameters<Class>
    ): InstanceType<Class> {
      return new klass(...args);
    };
  }

  export function as<SubType extends Type, Type>(): {
    (value: SubType): Type;
  } {
    return function (value: SubType): Type {
      return value;
    };
  }

  export function array<Values extends Array<Type>, Type>(): {
    (...values: Values): Array<Type>;
  } {
    return function (...values: Values): Array<Type> {
      return values;
    };
  }
}
