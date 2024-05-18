import { globSync } from "glob";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import tmp from "tmp";
import { generateComponentImplementations } from "../lib/generateComponentImplementations.js";

const fixturesDirName = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "fixtures",
  "generateComponentImplementations",
);

describe("generateComponentImplementations", () => {
  for (const fixtureDirNameSuffix of fs.readdirSync(fixturesDirName)) {
    let fixtureDirName: string;
    let fixtureFileNamesPattern: string[];
    let generatedFixtureFileNamesPattern: string;
    let fixtureFileNames: string[];
    let inputFixtureFileNames: string[];
    let tempDirName: string;

    beforeEach(() => {
      fixtureDirName = path.resolve(fixturesDirName, fixtureDirNameSuffix);
      fixtureFileNamesPattern = [
        path.resolve(fixtureDirName, "tsconfig.json"),
        path.resolve(fixtureDirName, "**", "*.ts"),
      ];
      generatedFixtureFileNamesPattern = path.resolve(
        fixtureDirName,
        "**",
        "gen",
        "*.ts",
      );
      fixtureFileNames = globSync(fixtureFileNamesPattern);
      inputFixtureFileNames = globSync(fixtureFileNamesPattern, {
        ignore: generatedFixtureFileNamesPattern,
      });
      const dirResult = tmp.dirSync({
        unsafeCleanup: true,
      });
      tempDirName = dirResult.name;
      for (const inputFixtureFileName of inputFixtureFileNames) {
        const tempFileName = buildTempFileName(
          fixtureDirName,
          inputFixtureFileName,
          tempDirName,
        );
        fs.copyFileSync(inputFixtureFileName, tempFileName);
      }
    });

    afterEach(() => {
      fs.rmSync(tempDirName, { recursive: true, force: true });
    });

    it(fixtureDirNameSuffix, () => {
      const tsConfigFileName = path.resolve(tempDirName, "tsconfig.json");
      generateComponentImplementations(tsConfigFileName);
      for (const fixtureFileName of fixtureFileNames) {
        const tempFileName = buildTempFileName(
          fixtureDirName,
          fixtureFileName,
          tempDirName,
        );
        const tempFile = fs.readFileSync(tempFileName).toString();
        const fixtureFile = fs.readFileSync(fixtureFileName).toString();
        assert.equal(tempFile, fixtureFile);
      }
    });
  }
});

function buildTempFileName(
  fixtureDirName: string,
  fixtureFileName: string,
  tempDirName: string,
) {
  return path.join(tempDirName, path.relative(fixtureDirName, fixtureFileName));
}
