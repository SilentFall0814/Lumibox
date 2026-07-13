import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { Library, Config } from '../../shared/types';

interface UserConfig {
  libraries: Library[];
  currentLibraryId: number | null;
}

const DEFAULT: UserConfig = { libraries: [], currentLibraryId: null };

function configPath(): string {
  return path.join(app.getPath('userData'), 'lumibox-config.json');
}

export function loadConfig(): UserConfig {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8');
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveConfig(cfg: UserConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf-8');
}

export function addLibrary(rootPath: string): UserConfig {
  const cfg = loadConfig();
  const baseName = path.basename(rootPath);
  let name = baseName;
  let i = 2;
  while (cfg.libraries.some((l) => l.name === name)) {
    name = `${baseName} (${i++})`;
  }
  const lib: Library = {
    id: Date.now(),
    name,
    rootPath: path.resolve(rootPath),
    createdAt: Date.now()
  };
  cfg.libraries.push(lib);
  cfg.currentLibraryId = lib.id;
  saveConfig(cfg);
  return cfg;
}

export function setCurrentLibrary(id: number): UserConfig {
  const cfg = loadConfig();
  cfg.currentLibraryId = id;
  saveConfig(cfg);
  return cfg;
}

export function getCurrentLibrary(): Library | null {
  const cfg = loadConfig();
  return cfg.libraries.find((l) => l.id === cfg.currentLibraryId) ?? null;
}

export function toConfig(cfg: UserConfig): Config {
  return { currentLibraryId: cfg.currentLibraryId };
}
