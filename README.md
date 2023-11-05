# @ealmansi/jagger

## Setup

1. Install dependencies:

```sh
npm add -D ts-patch @ealmansi/jagger
```

2. Configure prepare script:

```jsonc
// package.json
{
  "scripts": {
    "prepare": "ts-patch install -s"
  }
}
```

3. Ensure prepare script has been executed:

```sh
npm install
```

4. Configure TypeScript plugin:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "@ealmansi/jagger/transform"
      }
    ]
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
  protected provideLogger = Jagger.provide<Logger>;
  public provideApp = Jagger.provide<App>;
}

const app = new AppModule().provideApp();
app.start(); // App started!
```
