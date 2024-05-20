import { Provider } from "../model/Provider.js";

/**
 *
 */
export function array<Type, Items extends Type[]>(): Provider<Items, Type[]> {
  return function (...items: Items): Type[] {
    return items;
  };
}
