import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { getAppDirectory, getConfigPath } from "./paths.ts";
import type { ConfigFile, StoredApp, StoredProfile } from "../core/types.ts";
import { CliError } from "../core/errors.ts";

const DEFAULT_CONFIG: ConfigFile = {
  version: 1,
  apps: {},
  profiles: {},
};

function cloneDefaultConfig(): ConfigFile {
  return {
    version: 1,
    defaultProfileName: undefined,
    apps: {},
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
    const parsed = JSON.parse(raw) as ConfigFile;

    return {
      ...cloneDefaultConfig(),
      ...parsed,
      apps: parsed.apps ?? {},
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
  config.apps[app.name] = app;
  await saveConfig(config);
}

export async function upsertProfile(profile: StoredProfile): Promise<void> {
  const config = await loadConfig();
  config.profiles[profile.name] = profile;
  await saveConfig(config);
}

export async function setDefaultProfile(profileName: string): Promise<void> {
  const config = await loadConfig();

  if (!config.profiles[profileName]) {
    throw new CliError(`Unknown profile "${profileName}".`);
  }

  config.defaultProfileName = profileName;
  await saveConfig(config);
}

export async function removeProfile(profileName: string): Promise<void> {
  const config = await loadConfig();

  if (!config.profiles[profileName]) {
    throw new CliError(`Unknown profile "${profileName}".`);
  }

  delete config.profiles[profileName];

  if (config.defaultProfileName === profileName) {
    const remaining = Object.keys(config.profiles).sort()[0];
    config.defaultProfileName = remaining;
  }

  await saveConfig(config);
}
