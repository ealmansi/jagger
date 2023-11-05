# @ealmansi/jagger

## Publish a new version

```sh
npm version patch
git push origin HEAD
git push origin $(git tag -l | tail -1)
```
