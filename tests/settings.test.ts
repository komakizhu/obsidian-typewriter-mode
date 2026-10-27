import { expect, test } from "bun:test";
import type { Vault } from "obsidian";
import {
  applyStartupMigrations,
  DEFAULT_SETTINGS,
} from "@/capabilities/settings";

const vault = { adapter: { exists: async () => false } } as unknown as Vault;

function settingsWithCurrentLine(currentLine: Record<string, unknown>) {
  return {
    general: { ...DEFAULT_SETTINGS.general },
    currentLine,
    restoreCursorPosition: { ...DEFAULT_SETTINGS.restoreCursorPosition },
  };
}

test("appearance settings default safely for older and invalid stored values", async () => {
  const { settings, requiresSave } = await applyStartupMigrations(
    settingsWithCurrentLine({
      isHighlightCurrentLineEnabled: true,
      isHighlightLastBlockInReadingModeEnabled: false,
      isHighlightSideMarginsOnlyEnabled: true,
      highlightShape: "pill",
      highlightMaterial: 42,
      readingHighlightMode: "word",
    }),
    vault,
    ".obsidian/plugins/typewriter-mode"
  );

  expect(settings.currentLine.highlightShape).toBe("square");
  expect(settings.currentLine.highlightMaterial).toBe("plain");
  expect(settings.currentLine.readingHighlightMode).toBe("block");
  expect(settings.currentLine.isHighlightSideMarginsOnlyEnabled).toBe(true);
  expect(requiresSave).toBe(true);
});

test("older settings without appearance fields are normalized and saved once", async () => {
  const { settings, requiresSave } = await applyStartupMigrations(
    settingsWithCurrentLine({
      isHighlightCurrentLineEnabled: true,
      isHighlightLastBlockInReadingModeEnabled: false,
      isHighlightSideMarginsOnlyEnabled: true,
    }),
    vault,
    ".obsidian/plugins/typewriter-mode"
  );

  expect(settings.currentLine.highlightShape).toBe("square");
  expect(settings.currentLine.highlightMaterial).toBe("plain");
  expect(settings.currentLine.readingHighlightMode).toBe("block");
  expect(requiresSave).toBe(true);
});

test("appearance settings preserve valid values without another migration", async () => {
  const { settings, requiresSave } = await applyStartupMigrations(
    settingsWithCurrentLine({
      isHighlightCurrentLineEnabled: true,
      isHighlightLastBlockInReadingModeEnabled: false,
      isHighlightSideMarginsOnlyEnabled: false,
      highlightShape: "rounded",
      highlightMaterial: "frosted",
      readingHighlightMode: "line",
    }),
    vault,
    ".obsidian/plugins/typewriter-mode"
  );

  expect(settings.currentLine.highlightShape).toBe("rounded");
  expect(settings.currentLine.highlightMaterial).toBe("frosted");
  expect(settings.currentLine.readingHighlightMode).toBe("line");
  expect(requiresSave).toBe(false);
});
