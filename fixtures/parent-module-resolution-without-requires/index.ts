import { Jagger } from "@ealmansi/jagger";

class T1 {}
class T2 {
  constructor(_: Set<T1>) {}
}

export class Module1 extends Jagger.Module {
  static includes: [Module2];
  p1 = Jagger.instance(T1);
}

export class Module2 extends Jagger.Module {
  p1 = Jagger.instance(T1);
  p2 = Jagger.instance(T2);
}

/**
 * T2 will be constructed only with the T1 instance
 * from Module2, ignorning the one from Module1.
 */
export abstract class Component extends Jagger.Component {
  static module: Module1;
  abstract t2(): T2;
}
