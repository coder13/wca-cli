import { homedir } from "node:os";
import { join } from "node:path";

export const APP_DIR_NAME = ".wca-cli";
export const CONFIG_FILE_NAME = "config.json";
export const CACHE_DIR_NAME = "cache";

export function getAppDirectory(): string {
  return join(homedir(), APP_DIR_NAME);
}

export function getConfigPath(): string {
  return join(getAppDirectory(), CONFIG_FILE_NAME);
}

export function getCacheDirectory(): string {
  return join(getAppDirectory(), CACHE_DIR_NAME);
}

export function getWcifCacheDirectory(): string {
  return join(getCacheDirectory(), "wcif");
}
