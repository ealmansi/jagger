import { Provider } from "../model/Provider.js";

/**
 *
 */
export function tuple<Items extends any[] = []>(): Provider<Items, Items> {
  return function (...items: Items) {
    return items;
  };
}
