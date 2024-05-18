import { Jagger } from "@ealmansi/jagger";

export class Logger {
  constructor() {}
  log(message: string): void {
    console.log(message);
  }
}

export class App {
  constructor(private readonly logger: Logger) {}
  start() {
    this.logger.log("App started!");
  }
}

export class AppModule extends Jagger.Module {
  provideLogger = Jagger.instance(Logger);
  provideApp = Jagger.instance(App);
}

export abstract class AppComponent extends Jagger.Component {
  static module: AppModule;
  abstract buildApp(): App;
}
