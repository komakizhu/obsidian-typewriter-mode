import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

test("captures detached heading ranges before the render context expires", async () => {
  const source = readFileSync(
    `${import.meta.dir}/../src/cm6/reading-mode-highlight.ts`,
    "utf8"
  )
    .replace(/^import[\s\S]*?;\n/gm, "")
    .replace(
      "export default class ReadingModeHighlight",
      "globalThis.Manager = class ReadingModeHighlight"
    );
  class File {}
  const context = createContext({
    TFile: File,
    invalidateRenderedTextMap: () => undefined,
  });
  runInContext(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
      },
    }).outputText,
    context
  );
  let finishRead!: (text: string) => void;
  const manager = new context.Manager({
    plugin: {
      app: {
        vault: {
          getAbstractFileByPath: () => new File(),
          cachedRead: () =>
            new Promise<string>((resolve) => {
              finishRead = resolve;
            }),
        },
      },
    },
  });
  const attrs = new Map<string, string>();
  const element = {
    closest: () => null,
    matches: (selector: string) => selector.includes(".el-h4"),
    querySelectorAll: () => [],
    setAttribute: (key: string, value: string) => attrs.set(key, value),
    getAttribute: (key: string) => attrs.get(key) ?? null,
    dataset: {} as Record<string, string>,
  };
  let expired = false;
  let calls = 0;
  const pending = manager.processMarkdown(element, {
    sourcePath: "note.md",
    getSectionInfo: () => {
      expect(expired).toBe(false);
      calls++;
      return { lineStart: 2, lineEnd: 2, text: "#### Heading" };
    },
  });
  expired = true;
  finishRead("intro\n\n#### Heading");
  await pending;
  expect(calls).toBe(1);
  expect(attrs.get("data-ptm-reading-source")).toBeDefined();
  expect(element.dataset.ptmReadingBlockKind).toBe("heading");
  expect(element.dataset.ptmReadingBlockStart).toBe("2");
  expect(element.dataset.ptmReadingBlockEnd).toBe("2");
  // Cached sections must retain their provenance after the snapshot LRU expires.
  for (let i = 0; i < 20; i++) {
    manager.getSourceSnapshotToken("note.md", `changed ${i}`);
  }
  expect(manager.getRenderedBlockSection(element)?.filePath).toBe("note.md");
});
