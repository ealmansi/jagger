import { Jagger } from "@ealmansi/jagger";

class T1 {}
class T2 {}

export class Module extends Jagger.Module {
  p1(): T1 {
    return new T1();
  }
  p2(): T1 {
    return new T1();
  }
  p3(): T1 {
    return new T1();
  }
  p4(_: Set<T1>): T2 {
    return new T2();
  }
}

export abstract class Component extends Jagger.Component {
  static module: Module;
  abstract t2(): T2;
}
