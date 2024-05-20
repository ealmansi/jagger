import { Jagger } from "@ealmansi/jagger";

class Base {}
class Derived1 extends Base {}
class Derived2 extends Base {}
class Derived3 extends Base {}
class UsesSet {
  constructor(_: Set<Base>) {}
}
class UsesArray {
  constructor(_: Base[]) {}
}

export class Module extends Jagger.Module {
  d1 = Jagger.instance(Derived1);
  d2 = Jagger.instance(Derived2);
  d3 = Jagger.instance(Derived3);
  b1 = Jagger.as<Base>().use(this.d1);
  b2 = Jagger.as<Base>().use(this.d2);
  b3 = Jagger.as<Base>().use(this.d3);
  a = Jagger.array<Base, [Derived1, Derived2, Derived3]>();
  u1 = Jagger.instance(UsesSet);
  u2 = Jagger.instance(UsesArray);
}

export abstract class Component extends Jagger.Component {
  static module: Module;
  abstract u1(): UsesSet;
  abstract u2(): UsesArray;
}
