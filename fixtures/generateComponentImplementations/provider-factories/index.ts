import { Jagger } from "@ealmansi/jagger";

class Base {}
class Derived1 extends Base {}
class Derived2 extends Base {}
class Derived3 extends Base {}
class Other {
  constructor(public readonly base: Base[]) {}
}

export class Module extends Jagger.Module {
  _p1 = Jagger.instance(Derived1);
  _p2 = Jagger.instance(Derived2);
  _p3 = Jagger.instance(Derived3);
  p1 = Jagger.as<Derived1, Base>();
  p2 = Jagger.as<Derived2, Base>();
  p3 = Jagger.as<Derived3, Base>();
  p4 = Jagger.array<[Derived1, Derived2, Derived3], Base>();
  p5 = Jagger.instance(Other);
}

export abstract class Component extends Jagger.Component {
  static module: Module;
  abstract d5(): Other;
}
