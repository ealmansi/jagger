import { Jagger } from "@ealmansi/jagger";

class T1 {}
class T2 {}
class T3 {}
class T4 {}

export class Module1 extends Jagger.Module {
  static includes: [Module2];
  p1(): T1 {
    return new T1();
  }
  p2(_: T3): T2 {
    return new T2();
  }
}

export class Module2 extends Jagger.Module {
  static includes: [Module1];
  p3(): T3 {
    return new T3();
  }
  p4(_: T1): T4 {
    return new T4();
  }
}

export abstract class Component extends Jagger.Component {
  static module: Module1;
  abstract t1(): T1;
  abstract t2(): T2;
  abstract t3(): T3;
  abstract t4(): T4;
}
