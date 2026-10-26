import type { Vault } from "obsidian";

export interface GeneralSettings {
  isPluginActivated: boolean;
}

export interface CurrentLineSettings {
  isHighlightCurrentLineEnabled: boolean;
  isHighlightLastBlockInReadingModeEnabled: boolean;
}

export interface RestoreCursorPositionSettings {
  cursorPositions: Record<string, unknown>;
  isRestoreCursorPositionEnabled: boolean;
}

export interface TypewriterModeSettings {
  currentLine: CurrentLineSettings;
  general: GeneralSettings;
  restoreCursorPosition: RestoreCursorPositionSettings;
}

// Typesafe dotted-path type for accessing nested settings
export type SettingsPath = {
  [C in keyof TypewriterModeSettings]: `${C & string}.${keyof TypewriterModeSettings[C] & string}`;
}[keyof TypewriterModeSettings];

export type SettingValueAtPath<P extends SettingsPath> =
  P extends `${infer C}.${infer K}`
    ? C extends keyof TypewriterModeSettings
      ? K extends keyof TypewriterModeSettings[C]
        ? TypewriterModeSettings[C][K]
        : never
      : never
    : never;

export function getSettingByPath<P extends SettingsPath>(
  settings: TypewriterModeSettings,
  path: P
): SettingValueAtPath<P> {
  const dot = path.indexOf(".");
  const category = path.slice(0, dot) as keyof TypewriterModeSettings;
  const key = path.slice(dot + 1);
  return settings[category][key as never] as SettingValueAtPath<P>;
}

export function setSettingByPath<P extends SettingsPath>(
  settings: TypewriterModeSettings,
  path: P,
  value: SettingValueAtPath<P>
): void {
  const dot = path.indexOf(".");
  const category = path.slice(0, dot) as keyof TypewriterModeSettings;
  const key = path.slice(dot + 1);
  // @ts-expect-error
  settings[category][key] = value;
}

export const DEFAULT_SETTINGS: TypewriterModeSettings = {
  general: {
    isPluginActivated: true,
  },
  currentLine: {
    isHighlightCurrentLineEnabled: true,
    isHighlightLastBlockInReadingModeEnabled: false,
  },
  restoreCursorPosition: {
    isRestoreCursorPositionEnabled: false,
    cursorPositions: {},
  },
};

type RawSettings = Record<string, unknown>;

function asRecord(value: unknown): RawSettings | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RawSettings)
    : null;
}

function readValue<T>(
  group: RawSettings | null,
  key: string,
  fallback: T,
  legacyGroup?: RawSettings | null,
  legacyKey = key
): T {
  const value = group?.[key] ?? legacyGroup?.[legacyKey];
  if (typeof value !== typeof fallback) {
    return fallback;
  }
  if (
    fallback !== null &&
    typeof fallback === "object" &&
    asRecord(value) === null
  ) {
    return fallback;
  }
  return value as T;
}

function normalizeSettings(raw: RawSettings): TypewriterModeSettings {
  const legacy = raw;
  const general = asRecord(raw.general);
  const currentLine = asRecord(raw.currentLine);
  const restoreCursorPosition = asRecord(raw.restoreCursorPosition);

  return {
    general: {
      isPluginActivated: readValue(
        general,
        "isPluginActivated",
        DEFAULT_SETTINGS.general.isPluginActivated,
        legacy
      ),
    },
    currentLine: {
      isHighlightCurrentLineEnabled: readValue(
        currentLine,
        "isHighlightCurrentLineEnabled",
        DEFAULT_SETTINGS.currentLine.isHighlightCurrentLineEnabled,
        legacy
      ),
      isHighlightLastBlockInReadingModeEnabled: readValue(
        currentLine,
        "isHighlightLastBlockInReadingModeEnabled",
        DEFAULT_SETTINGS.currentLine.isHighlightLastBlockInReadingModeEnabled,
        legacy
      ),
    },
    restoreCursorPosition: {
      isRestoreCursorPositionEnabled: readValue(
        restoreCursorPosition,
        "isRestoreCursorPositionEnabled",
        DEFAULT_SETTINGS.restoreCursorPosition.isRestoreCursorPositionEnabled,
        legacy
      ),
      cursorPositions: readValue(
        restoreCursorPosition,
        "cursorPositions",
        DEFAULT_SETTINGS.restoreCursorPosition.cursorPositions,
        legacy
      ),
    },
  };
}

function hasExactKeys(value: unknown, keys: string[]): boolean {
  const record = asRecord(value);
  return Boolean(
    record &&
      Object.keys(record).length === keys.length &&
      keys.every((key) => Object.hasOwn(record, key))
  );
}

function isCurrentSettingsShape(raw: RawSettings): boolean {
  return (
    hasExactKeys(raw, ["general", "currentLine", "restoreCursorPosition"]) &&
    hasExactKeys(raw.general, ["isPluginActivated"]) &&
    hasExactKeys(raw.currentLine, [
      "isHighlightCurrentLineEnabled",
      "isHighlightLastBlockInReadingModeEnabled",
    ]) &&
    hasExactKeys(raw.restoreCursorPosition, [
      "isRestoreCursorPositionEnabled",
      "cursorPositions",
    ])
  );
}

async function migrateCursorPositions(
  settings: TypewriterModeSettings,
  vault: Vault,
  manifestDir: string
): Promise<TypewriterModeSettings> {
  const oldFilePath = `${manifestDir}/cursor-positions.json`;

  try {
    if (await vault.adapter.exists(oldFilePath)) {
      const data = await vault.adapter.read(oldFilePath);
      const cursorPositions = JSON.parse(data);
      settings.restoreCursorPosition.cursorPositions = cursorPositions;
      console.debug(
        "Migrated cursor positions from cursor-positions.json to data.json"
      );
    }
  } catch (error) {
    console.error("Failed to migrate cursor positions:", error);
  }

  return settings;
}

export interface StartupMigrationResult {
  requiresSave: boolean;
  settings: TypewriterModeSettings;
}

export async function applyStartupMigrations(
  rawData: unknown,
  vault: Vault,
  manifestDir: string
): Promise<StartupMigrationResult> {
  const raw = asRecord(rawData) ?? {};
  const isLegacyFormat = !Object.hasOwn(raw, "general");
  const settings = normalizeSettings(raw);

  if (isLegacyFormat) {
    return {
      requiresSave: true,
      settings: await migrateCursorPositions(settings, vault, manifestDir),
    };
  }

  return {
    requiresSave: !isCurrentSettingsShape(raw),
    settings,
  };
}
