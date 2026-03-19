import { loadConfig, removeProfile, saveConfig, setDefaultProfile } from "../config/store.ts";
import type { AuthStrategy, StoredProfile } from "../core/types.ts";
import { CliError } from "../core/errors.ts";
import { loginProfile } from "../auth/service.ts";
import { printJson, printLine, prompt, select } from "../ui/prompts.ts";

function now(): string {
  return new Date().toISOString();
}

function renderSummary(config: Awaited<ReturnType<typeof loadConfig>>, profile: StoredProfile): string {
  const parts = [
    profile.name,
    `strategy=${profile.auth.strategy}`,
    profile.appName ? `app=${profile.appName}` : undefined,
    config.defaultProfileName === profile.name ? "default=true" : undefined,
  ].filter(Boolean);

  return parts.join(" ");
}

export async function listProfiles(): Promise<void> {
  const config = await loadConfig();
  const profiles = Object.values(config.profiles).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  if (profiles.length === 0) {
    printLine("No profiles configured.");
    return;
  }

  for (const profile of profiles) {
    printLine(renderSummary(config, profile));
  }
}

export async function showProfile(profileName?: string): Promise<void> {
  const config = await loadConfig();
  const selected = profileName ?? config.defaultProfileName;

  if (!selected) {
    throw new CliError("No profile selected.");
  }

  const profile = config.profiles[selected];

  if (!profile) {
    throw new CliError(`Unknown profile "${selected}".`);
  }

  printJson({
    ...profile,
    accessToken: profile.accessToken ? "[stored]" : undefined,
    auth: {
      ...profile.auth,
      password: profile.auth.password ? "[stored]" : undefined,
    },
    default: config.defaultProfileName === profile.name,
  });
}

export async function useProfile(profileName: string): Promise<void> {
  await setDefaultProfile(profileName);
  printLine(`Default profile set to "${profileName}".`);
}

export async function deleteProfile(profileName: string): Promise<void> {
  await removeProfile(profileName);
  printLine(`Removed profile "${profileName}".`);
}

export async function addProfile(): Promise<void> {
  const config = await loadConfig();
  const existingApps = Object.keys(config.apps).sort();

  if (existingApps.length === 0) {
    throw new CliError("No apps are configured yet. Run `wca-cli setup` first.");
  }

  const name = await prompt("Profile name");
  const strategy = await select<AuthStrategy>(
    "Authentication method",
    ["oauth-code", "password", "access-token"],
    "oauth-code",
  );
  const appName =
    strategy === "access-token"
      ? undefined
      : existingApps.length === 1
        ? existingApps[0]
        : await select("App", existingApps);

  const profile: StoredProfile = {
    name,
    appName,
    auth: {
      strategy,
      email: strategy === "password" ? await prompt("WCA email") : undefined,
      password:
        strategy === "password" ? await prompt("WCA password", { secret: true }) : undefined,
    },
    accessToken:
      strategy === "access-token" ? await prompt("Access token or API key") : undefined,
    createdAt: now(),
    updatedAt: now(),
  };

  config.profiles[name] = profile;
  await saveConfig(config);

  printLine(`Saved profile "${name}".`);
}

export async function loginExistingProfile(profileName: string): Promise<void> {
  await loginProfile(profileName);
  printLine(`Logged in profile "${profileName}".`);
}
