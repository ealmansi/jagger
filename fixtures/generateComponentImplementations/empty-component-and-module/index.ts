import { Jagger } from "@ealmansi/jagger";

export class Module extends Jagger.Module {}

export abstract class Component extends Jagger.Component {
  static module: Module;
}
