import { Provider } from "../model/Provider.js";

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
