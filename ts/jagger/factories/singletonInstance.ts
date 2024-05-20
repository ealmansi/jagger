import { instance } from "./instance.js";
import { singleton } from "./singleton.js";

/**
 *
 */
export function singletonInstance<
  Class extends new (...constructorParameters: any) => any,
>(class_: Class) {
  return singleton(instance(class_));
}
