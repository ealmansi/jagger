/**
 *
 */
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
    return function (...args: ConstructorParameters<Class>) {
      return new klass(...args);
    };
  }
}
