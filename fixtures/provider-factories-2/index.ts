import { Jagger } from "@ealmansi/jagger";

class C1 {}
class C2 {}

export class Module extends Jagger.Module {
  p1 = Jagger.singleton(Jagger.instance(C1));
  p2 = Jagger.singletonInstance(C2);
  p3 = Jagger.value(42);
}

export abstract class Component extends Jagger.Component {
  static module: Module;
  abstract c1(): C1;
  abstract c2(): C2;
  abstract n(): number;
}
