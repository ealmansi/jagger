/**
 *
 */
export class Jagger {
  /**
   *
   */
  public static provide<Args extends unknown[], T>(
    _: new (...args: Args) => T
  ): () => T {
    return function provide() {
      throw new Error(
        [
          "Jagger has not been configured correctly.",
          "Please, visit https://github.com/ealmansi/jagger.",
        ].join(" ")
      );
    };
  }
}
