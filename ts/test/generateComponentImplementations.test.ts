import gitDiff from "git-diff";
import memfs from "memfs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import ts from "typescript";
import { generateComponentImplementations } from "../lib/generateComponentImplementations.js";
import { orThrow } from "../lib/orThrow.js";

const fixturesDirPath = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "fixtures",
  "generateComponentImplementations",
);

describe("generateComponentImplementations", () => {
  for (const fixtureDirBase of fs.readdirSync(fixturesDirPath)) {
    const fixtureDirPath = path.resolve(fixturesDirPath, fixtureDirBase);
    if (!fs.lstatSync(fixtureDirPath).isDirectory()) {
      continue;
    }

    beforeEach(() => {
      memfs.vol.reset();
    });

    it(fixtureDirBase, () => {
      const tsConfigFilePath = path.resolve(
        fixturesDirPath,
        fixtureDirBase,
        "tsconfig.json",
      );
      const system = buildSystem();
      generateComponentImplementations(system, tsConfigFilePath);
      const directoryJson = memfs.vol.toJSON();
      for (const filePath in directoryJson) {
        const actualFile = orThrow(directoryJson[filePath]);
        const expectedFile = orThrow(system.readFile(filePath));
        const diff = gitDiff(expectedFile, actualFile, { color: true });
        assert.ok(diff === undefined, diff);
      }
    });
  }
});

function buildSystem(): ts.System {
  return {
    args: [],
    newLine: "\n",
    useCaseSensitiveFileNames: true,
    write() {
      assert.fail("Not implemented");
    },
    writeOutputIsTTY() {
      assert.fail("Not implemented");
    },
    getWidthOfTerminal() {
      assert.fail("Not implemented");
    },
    readFile: ts.sys.readFile,
    getFileSize() {
      assert.fail("Not implemented");
    },
    writeFile(path: string, data: string) {
      memfs.vol.writeFileSync(path, data);
    },
    watchFile() {
      assert.fail("Not implemented");
    },
    watchDirectory() {
      assert.fail("Not implemented");
    },
    resolvePath: ts.sys.resolvePath,
    fileExists: ts.sys.fileExists,
    directoryExists() {
      assert.fail("Not implemented");
    },
    createDirectory(path: string) {
      memfs.vol.mkdirSync(path, { recursive: true });
    },
    getExecutingFilePath() {
      assert.fail("Not implemented");
    },
    getCurrentDirectory() {
      assert.fail("Not implemented");
    },
    getDirectories() {
      assert.fail("Not implemented");
    },
    readDirectory: ts.sys.readDirectory,
    getModifiedTime() {
      assert.fail("Not implemented");
    },
    setModifiedTime() {
      assert.fail("Not implemented");
    },
    deleteFile() {
      assert.fail("Not implemented");
    },
    createHash() {
      assert.fail("Not implemented");
    },
    createSHA256Hash() {
      assert.fail("Not implemented");
    },
    getMemoryUsage() {
      assert.fail("Not implemented");
    },
    exit() {
      assert.fail("Not implemented");
    },
    realpath() {
      assert.fail("Not implemented");
    },
    setTimeout() {
      assert.fail("Not implemented");
    },
    clearTimeout() {
      assert.fail("Not implemented");
    },
    clearScreen() {
      assert.fail("Not implemented");
    },
    base64decode() {
      assert.fail("Not implemented");
    },
    base64encode() {
      assert.fail("Not implemented");
    },
  };
}
