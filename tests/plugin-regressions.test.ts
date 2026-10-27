// biome-ignore-all lint/suspicious/noEmptyBlockStatements: VM test doubles intentionally no-op.
// biome-ignore-all lint/complexity/noBannedTypes: VM test doubles use broad callable shapes.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";
import { getEditorFilePath } from "@/cm6/editor-identity";
import { normalizeSelectionRange } from "@/cm6/selection-utils";
import { isMarkdownTableBlock } from "@/cm6/table-detection";
import { inspectTransactionState } from "@/cm6/transaction-state";

const pluginPath = `${import.meta.dir}/../src/cm6/plugin.ts`;

function loadPluginClass() {
  let source = readFileSync(pluginPath, "utf8");
  source = source.replace(/^import[\s\S]*?;\n/gm, "");
  source = source.split(
    "export default function createTypewriterModeViewPlugin"
  )[0];
  source = source.replace(
    "class TypewriterModeCM6Plugin",
    "globalThis.TypewriterModeCM6Plugin = class TypewriterModeCM6Plugin"
  );

  const context = createContext({
    console: { debug() {}, error() {} },
    exports: {},
    Element: class {},
    Node: { ELEMENT_NODE: 1 },
    RangeSet: { empty: {} },
    Transaction: { userEvent: "userEvent" },
    editorInfoField: {},
    Platform: {
      isMobile: false,
      isDesktop: true,
      isTablet: false,
      isPhone: false,
    },
    EditorView: { scrollIntoView: () => ({}) },
    getEditorDom: (view: { dom: unknown }) => view.dom,
    getScrollDom: (view: { scrollDOM?: unknown; dom: unknown }) =>
      view.scrollDOM ?? view.dom,
    getActiveSentenceDecos: () => ({}),
    getEditorFilePath,
    normalizeSelectionRange,
    isMarkdownTableBlock,
    inspectTransactionState,
    MutationObserver: class {
      static instances: Array<{ connected: boolean }> = [];
      connected = false;
      constructor(_callback: unknown) {
        (
          this.constructor as unknown as {
            instances: Array<{ connected: boolean }>;
          }
        ).instances.push(this);
      }
      observe() {
        this.connected = true;
      }
      disconnect() {
        this.connected = false;
      }
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    window: {
      requestAnimationFrame(callback: () => void) {
        callback();
        return 1;
      },
      cancelAnimationFrame() {},
      clearTimeout() {},
      setTimeout() {
        return 1;
      },
      addEventListener() {},
      removeEventListener() {},
    },
  });

  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  runInContext(output, context);
  return {
    PluginClass: context.TypewriterModeCM6Plugin as Record<string, Function> & {
      prototype: Record<string, Function>;
    },
    context: context as unknown as Record<string, any>,
  };
}

const { PluginClass, context: pluginContext } = loadPluginClass();

function makePlugin() {
  return Object.create(PluginClass.prototype) as Record<string, any>;
}

describe("Typewriter Mode plugin regressions", () => {
  test("restores only when enabled and clamps a shortened document", () => {
    const plugin = makePlugin();
    const dispatches: unknown[] = [];
    const view = {
      state: {
        doc: { length: 10 },
        field: () => ({ file: { path: "A.md" } }),
      },
      dispatch(value: unknown) {
        dispatches.push(value);
      },
    };
    plugin.isDestroyed = false;
    plugin.view = view;
    plugin.tm = {
      settings: {
        restoreCursorPosition: { isRestoreCursorPositionEnabled: true },
      },
      getRestoreCursorPositionFeature: () => ({
        saveState: async () => {},
        state: {
          "A.md": { anchor: 50, head: 50 },
          "B.md": { anchor: 2, head: 2 },
        },
      }),
      plugin: {
        app: { workspace: { containerEl: { querySelector: () => null } } },
      },
    };
    plugin.scheduleAnimationFrame = (callback: () => void) => callback();
    plugin.restoreCursorPosition(view);
    expect(dispatches).toEqual([{ selection: { anchor: 10, head: 10 } }]);

    dispatches.length = 0;
    plugin.tm.settings.restoreCursorPosition.isRestoreCursorPositionEnabled = false;
    plugin.restoreCursorPosition(view);
    expect(dispatches).toEqual([]);
  });

  test("cleans the embedded markdown observer on destroy", () => {
    const plugin = makePlugin();
    const document = { removeEventListener() {} };
    plugin.tm = { perWindowProps: {} };
    plugin.view = {
      dom: {
        ownerDocument: document,
        removeEventListener() {},
        classList: { remove() {} },
      },
    };
    plugin.isDestroyed = false;
    plugin.pendingAnimationFrames = new Set();
    plugin.tableOverlayCheckFrame = null;
    plugin.loadPerWindowPropsOnElement = () => {};
    plugin.scheduleTableOverlayCheck = () => {};
    plugin.watchEmbeddedMarkdown();
    const observer = pluginContext.MutationObserver.instances.at(-1);
    plugin.destroyCurrentLine = () => {};
    plugin.removeScrollListener = () => {};
    plugin.destroy();
    expect(observer?.connected).toBe(false);
  });

  test("finishes an allowed input when measurement returns null", () => {
    const plugin = makePlugin();
    let listeners = 0;
    plugin.tm = {
      settings: { currentLine: { isHighlightCurrentLineEnabled: true } },
    };
    plugin.view = { dom: { classList: { remove() {}, add() {} } } };
    plugin.isInitialInteraction = false;
    plugin.removeScrollListener = () => {
      listeners -= 1;
    };
    plugin.setupScrollListener = () => {
      listeners += 1;
    };
    plugin.measureCurrentLinePosition = (_key: string, callback: Function) => {
      callback(null, plugin.view);
      return true;
    };
    plugin.isRenderingAllowedUserEvent = false;
    plugin.updateAllowedUserEvent();
    expect(plugin.isRenderingAllowedUserEvent).toBe(false);
    expect(listeners).toBe(0);

    plugin.measureCurrentLinePosition = () => false;
    plugin.updateAllowedUserEvent();
    expect(plugin.isRenderingAllowedUserEvent).toBe(false);
    expect(listeners).toBe(0);
  });

  test("drops a measurement from an older document state", () => {
    const plugin = makePlugin();
    let measuredWrite: ((measure: unknown, view: unknown) => void) | undefined;
    const documentA = { length: 10 };
    const documentB = { length: 11 };
    const view = {
      state: {
        doc: documentA,
        field: () => ({ file: { path: "A.md" } }),
      },
      requestMeasure(spec: {
        write: (measure: unknown, view: unknown) => void;
      }) {
        measuredWrite = spec.write;
      },
    };
    const writes: unknown[] = [];
    plugin.view = view;
    plugin.isDestroyed = false;
    plugin.measurementGeneration = 1;
    plugin.scheduleAnimationFrame = (callback: () => void) => callback();
    PluginClass.prototype.measureCurrentLinePosition.call(
      plugin,
      "stale-measurement",
      (measure: unknown) => writes.push(measure)
    );

    view.state.doc = documentB;
    plugin.measurementGeneration = 2;
    measuredWrite?.({ activeLineOffset: 1 }, view);
    expect(writes).toEqual([]);
  });
});
