/**
 *
 */
export class Jagger {
  /**
   *
   */
  public static provide<T>(): T {
    throw new Error(
      [
        "Jagger has not been configured correctly.",
        "Please, visit https://github.com/ealmansi/jagger.",
      ].join(" ")
    );
  }
}
