import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getWcifCacheDirectory } from "../config/paths.ts";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function sanitizeCompetitionId(competitionId: string): string {
  return competitionId.replace(/[^A-Za-z0-9._-]/g, "_");
}

function getCachePath(competitionId: string): string {
  return join(getWcifCacheDirectory(), `${sanitizeCompetitionId(competitionId)}.json`);
}

export async function readCachedWcif(competitionId: string, ttlMs = FIVE_MINUTES_MS): Promise<unknown | null> {
  const cachePath = getCachePath(competitionId);

  try {
    const fileStat = await stat(cachePath);
    const ageMs = Date.now() - fileStat.mtimeMs;

    if (ageMs > ttlMs) {
      return null;
    }

    const raw = await readFile(cachePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeCachedWcif(competitionId: string, data: unknown): Promise<void> {
  const cacheDir = getWcifCacheDirectory();
  const cachePath = getCachePath(competitionId);
  await mkdir(cacheDir, { recursive: true });
  await chmod(cacheDir, 0o700);
  await writeFile(cachePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await chmod(cachePath, 0o600);
}

export async function getCachedWcifPath(competitionId: string): Promise<string> {
  const cacheDir = getWcifCacheDirectory();
  await mkdir(cacheDir, { recursive: true });
  await chmod(cacheDir, 0o700);
  return getCachePath(competitionId);
}

export { FIVE_MINUTES_MS };
