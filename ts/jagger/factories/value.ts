import { Provider } from "../model/Provider.js";

/**
 *
 */
export function value<T>(value_: T): Provider<[], T> {
  return function () {
    return value_;
  };
}
