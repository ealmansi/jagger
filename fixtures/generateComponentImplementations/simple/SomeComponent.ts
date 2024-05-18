import { Jagger } from "@ealmansi/jagger";

export class App {}

export class Module extends Jagger.Module {
  provideApp(): App {
    return new App();
  }
}

export abstract class Component extends Jagger.Component {
  static module: Module;
  abstract getApp(): App;
}
