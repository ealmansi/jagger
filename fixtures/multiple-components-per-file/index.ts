import { Jagger } from "@ealmansi/jagger";

export class Module1 extends Jagger.Module {}
export class Module2 extends Jagger.Module {}
export class Module3 extends Jagger.Module {}

export abstract class Component1 extends Jagger.Component {
  static module: Module1;
}
export abstract class Component2 extends Jagger.Component {
  static module: Module2;
}
export abstract class Component3 extends Jagger.Component {
  static module: Module3;
}
