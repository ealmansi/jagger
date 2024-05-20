import { Provider } from "../model/Provider.js";

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
