import { Jagger } from "@ealmansi/jagger";

class T1 {}
class T2 {
  constructor(_: T1) {}
}
class T3 {
  constructor(_: Set<T1>) {}
}

export class Module1 extends Jagger.Module {
  static imports: [Module2];
  p1 = Jagger.instance(T1);
}

export class Module2 extends Jagger.Module {
  p1 = Jagger.instance(T1);
  p2 = Jagger.instance(T2);
  p3 = Jagger.instance(T3);
}

export abstract class Component extends Jagger.Component {
  static module: Module1;
  abstract t1(): T1;
  abstract t2(): T2;
  abstract t3(): T3;
}
