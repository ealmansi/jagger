# @ealmansi/jagger

## Setup

1. Install dependencies:

```sh
npm add @ealmansi/jagger
```

2. Configure prebuild script:

```jsonc
// package.json
{
  "scripts": {
    "prebuild": "jagger-generate"
  }
}
```

## Usage

```ts
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

// in index.ts
const app = new AppComponentImpl().provideApp();
app.start(); // App started!
```
