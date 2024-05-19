import { Jagger } from "@ealmansi/jagger";

class T1 {}
class T2 {
  constructor(_: T1) {}
}
class T3 {
  constructor(_: Set<T2>) {}
}

export class Module extends Jagger.Module {
  async p1(): Promise<T1> {
    return new T1();
  }
  p2 = Jagger.instance(T2);
  p3 = Jagger.instance(T3);
}

export abstract class Component extends Jagger.Component {
  static module: Module;
  abstract t1(): Promise<T1>;
  abstract t2(): Promise<T2>;
  abstract t3(): Promise<T3>;
}
