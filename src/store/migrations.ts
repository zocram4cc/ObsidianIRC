import type { ServerConfig } from "../types";
import { KEYS, migrationVersion } from "./localStorage";

interface Migration {
  version: number;
  name: string;
  run: () => void;
}

function v1_addServerTimestamps(): void {
  const servers = JSON.parse(localStorage.getItem(KEYS.SERVERS) || "[]");
  let needsMigration = false;

  const baseTimestamp = Date.now() - servers.length * 1000;

  const migrated = servers.map((server: ServerConfig, index: number) => {
    if (!server.addedAt) {
      needsMigration = true;
      return {
        ...server,
        addedAt: baseTimestamp + index * 1000,
      };
    }
    return server;
  });

  if (needsMigration) {
    localStorage.setItem(KEYS.SERVERS, JSON.stringify(migrated));
  }
}

function v2_addAppearanceSettings(): void {
  const settingsRaw = localStorage.getItem(KEYS.SETTINGS);
  if (!settingsRaw) return;

  try {
    const settings = JSON.parse(settingsRaw);
    let changed = false;

    if (settings.chatFontScaling === undefined) {
      settings.chatFontScaling = 16;
      changed = true;
    }

    if (settings.uiScaling === undefined) {
      settings.uiScaling = 100;
      changed = true;
    }

    if (changed) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    }
  } catch (e) {
    console.error("Failed to migrate appearance settings:", e);
  }
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "addServerTimestamps",
    run: v1_addServerTimestamps,
  },
  {
    version: 2,
    name: "addAppearanceSettings",
    run: v2_addAppearanceSettings,
  },
];

const CURRENT_VERSION = 2;

export function runPendingMigrations(): void {
  const current = migrationVersion.get();
  const pending = migrations.filter((m) => m.version > current);

  if (pending.length === 0) {
    return;
  }

  for (const migration of pending) {
    try {
      migration.run();
    } catch (error) {
      console.error(`Migration ${migration.name} failed:`, error);
      throw error;
    }
  }

  migrationVersion.set(CURRENT_VERSION);
}
