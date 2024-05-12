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

class Logger {
  constructor() {}

  log(message: string): void {
    console.log(message);
  }
}

class App {
  constructor(private readonly logger: Logger) {}

  start() {
    this.logger.log("App started!");
  }
}

class AppModule {
  protected provideLogger = Jagger.provide(Logger);
  public provideApp = Jagger.provide(App);
}

const app = new AppModule().provideApp();
app.start(); // App started!
```
