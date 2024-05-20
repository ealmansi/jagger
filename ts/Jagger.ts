/**
 *
 */
export abstract class Component {}

/**
 *
 */
export abstract class Module {}

/**
 *
 */
export interface Provider<Parameters extends any[], Type> {
  (...parameters: Parameters): Type;
}

/**
 *
 */
export function value<T>(value_: T): Provider<[], T> {
  return function () {
    return value_;
  };
}

/**
 *
 */
export function instance<
  Class extends new (...constructorParameters: any) => any,
>(class_: Class): Provider<ConstructorParameters<Class>, InstanceType<Class>> {
  return function (
    ...constructorParameters: ConstructorParameters<Class>
  ): InstanceType<Class> {
    return new class_(...constructorParameters);
  };
}

/**
 *
 */
export function singleton<Parameters extends any[], T>(
  provider: Provider<Parameters, T>,
) {
  let initialized = false;
  let value: T;
  return function (...parameters: Parameters): T {
    if (!initialized) {
      initialized = true;
      value = provider(...parameters);
    }
    return value;
  };
}

/**
 *
 */
export function singletonInstance<Class extends new (...args: any) => any>(
  class_: Class,
) {
  return singleton(instance(class_));
}

/**
 *
 */
export function as<SubType extends Type, Type>(): Provider<[SubType], Type> {
  return function (value: SubType): Type {
    return value;
  };
}

/**
 *
 */
export function array<Items extends Type[], Type>(): Provider<Items, Type[]> {
  return function (...items: Items): Type[] {
    return items;
  };
}
