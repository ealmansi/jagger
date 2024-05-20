# @ealmansi/jagger

## TODO

- Reusable Providers
- Optional Binding
- Multiple components in same file
- CLI
  - Reject path without --project in bin/generate
  - Allow passing in directory path /a/b/c instead of /a/b/c/tsconfig.json

## Publish a new version

```sh
npm version patch
git push origin HEAD
git push origin $(git describe)
```
