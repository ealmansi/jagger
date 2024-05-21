import { Jagger } from "@ealmansi/jagger";

export class Module extends Jagger.Module {
  pa(): "a" {
    return "a";
  }
  pb(au: "a" | undefined, an: "a" | null): "b" {
    return "b";
  }
  pc(x: "x" | undefined, y: "y" | null): "c" {
    return "c";
  }
}

export abstract class Component extends Jagger.Component {
  static module: Module;
  abstract a(): "a";
  abstract b(): "b";
  abstract c(): "c";
}
