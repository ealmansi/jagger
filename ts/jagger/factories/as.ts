import { Provider } from "../model/Provider.js";
import { instance } from "./instance.js";

/**
 *
 */
export function as<Type>() {
  return {
    use<SubType extends Type, Parameters extends any[]>(
      provider: Provider<Parameters, SubType>,
    ): Provider<Parameters, Type> {
      return provider;
    },
    instance<
      SubType extends Type,
      Class extends new (...constructorParameters: any) => SubType,
    >(class_: Class): Provider<ConstructorParameters<Class>, SubType> {
      return instance(class_);
    },
  };
}
