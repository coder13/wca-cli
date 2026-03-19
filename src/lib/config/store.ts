import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { getAppDirectory, getConfigPath } from "./paths.ts";
import { CliError } from "../errors.ts";
import type { ConfigFile, StoredApp, StoredProfile } from "../types.ts";

const DEFAULT_CONFIG: ConfigFile = {
  version: 1,
  profiles: {},
};

function cloneDefaultConfig(): ConfigFile {
  return {
    version: 1,
    app: undefined,
    defaultProfileName: undefined,
    profiles: {},
  };
}

export async function ensureConfigDirectory(): Promise<void> {
  const dir = getAppDirectory();
  await mkdir(dir, { recursive: true });
  await chmod(dir, 0o700);
}

export async function loadConfig(): Promise<ConfigFile> {
  await ensureConfigDirectory();
  const configPath = getConfigPath();

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as ConfigFile & {
      app?: StoredApp;
      apps?: Record<string, StoredApp>;
      defaultAppName?: string;
    };

    // Backward compatibility for the earlier multi-app config shape.
    const normalizedApp =
      parsed.app ??
      (parsed.defaultAppName ? parsed.apps?.[parsed.defaultAppName] : undefined) ??
      Object.values(parsed.apps ?? {})[0];

    return {
      ...cloneDefaultConfig(),
      ...parsed,
      app: normalizedApp,
      profiles: parsed.profiles ?? {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await saveConfig(DEFAULT_CONFIG);
      return cloneDefaultConfig();
    }

    throw new CliError(`Failed to read config file at ${configPath}.`);
  }
}

export async function saveConfig(config: ConfigFile): Promise<void> {
  await ensureConfigDirectory();
  const configPath = getConfigPath();
  const payload = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, payload, "utf8");
  await chmod(configPath, 0o600);
}

export async function upsertApp(app: StoredApp): Promise<void> {
  const config = await loadConfig();
  config.app = app;
  await saveConfig(config);
}

export async function upsertProfile(profile: StoredProfile): Promise<void> {
  const config = await loadConfig();
  config.profiles[profile.name] = profile;
  await saveConfig(config);
}

export function findProfileKey(
  config: Pick<ConfigFile, "profiles">,
  profileRef: string,
): string | undefined {
  if (config.profiles[profileRef]) {
    return profileRef;
  }

  return Object.entries(config.profiles).find(([, profile]) => profile.name === profileRef)?.[0];
}

export async function setDefaultProfile(profileName: string): Promise<void> {
  const config = await loadConfig();
  const profileKey = findProfileKey(config, profileName);

  if (!profileKey) {
    throw new CliError(`Unknown profile "${profileName}".`);
  }

  config.defaultProfileName = profileKey;
  await saveConfig(config);
}

export async function removeProfile(profileName: string): Promise<void> {
  const config = await loadConfig();
  const profileKey = findProfileKey(config, profileName);

  if (!profileKey) {
    throw new CliError(`Unknown profile "${profileName}".`);
  }

  delete config.profiles[profileKey];

  if (config.defaultProfileName === profileKey) {
    const remaining = Object.keys(config.profiles).sort()[0];
    config.defaultProfileName = remaining;
  }

  await saveConfig(config);
}
