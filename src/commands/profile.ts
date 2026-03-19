import type { Command } from "commander";
import { loginProfile } from "../lib/auth/service.ts";
import {
  findProfileKey,
  loadConfig,
  removeProfile,
  saveConfig,
  setDefaultProfile,
} from "../lib/config/store.ts";
import { CliError } from "../lib/errors.ts";
import { writeSuccess } from "../lib/output.ts";
import { printLine, prompt, select } from "../lib/prompts.ts";
import type { AuthStrategy, StoredProfile } from "../lib/types.ts";

function now(): string {
  return new Date().toISOString();
}

export async function promptForNewProfile(
  defaultName?: string,
  existingProfile?: StoredProfile,
): Promise<StoredProfile> {
  printLine("Use `oauth-code` for browser-based OAuth authorization code login with automatic local callback handling.");

  const strategy = await select<AuthStrategy>(
    "User login method",
    ["oauth-code", "password"],
    existingProfile?.auth.strategy ?? "oauth-code",
  );

  return {
    name: await prompt("Profile name", {
      defaultValue: defaultName ?? existingProfile?.name ?? "default",
    }),
    auth: {
      strategy,
      email:
        strategy === "password"
          ? await prompt("WCA email", { defaultValue: existingProfile?.auth.email })
          : undefined,
      password:
        strategy === "password" ? await prompt("WCA password", { secret: true }) : undefined,
    },
    accessToken: existingProfile?.accessToken,
    refreshToken: existingProfile?.refreshToken,
    tokenType: existingProfile?.tokenType,
    expiresAt: existingProfile?.expiresAt,
    createdAt: existingProfile?.createdAt ?? now(),
    updatedAt: now(),
  };
}

function summarizeProfile(
  config: Awaited<ReturnType<typeof loadConfig>>,
  key: string,
  profile: StoredProfile,
) {
  return {
    key,
    name: profile.name,
    strategy: profile.auth.strategy,
    default: config.defaultProfileName === key,
  };
}

export async function listProfiles(): Promise<void> {
  const config = await loadConfig();
  const profiles = Object.entries(config.profiles).sort(([, left], [, right]) =>
    left.name.localeCompare(right.name),
  );

  if (profiles.length === 0) {
    writeSuccess([]);
    return;
  }

  writeSuccess(profiles.map(([key, profile]) => summarizeProfile(config, key, profile)));
}

export async function showProfile(profileName?: string): Promise<void> {
  const config = await loadConfig();
  const selected = profileName ?? config.defaultProfileName;

  if (!selected) {
    throw new CliError("No profile selected.");
  }

  const profileKey = findProfileKey(config, selected);
  const profile = profileKey ? config.profiles[profileKey] : undefined;

  if (!profile) {
    throw new CliError(`Unknown profile "${selected}".`);
  }

  writeSuccess({
    key: profileKey,
    ...profile,
    accessToken: profile.accessToken ? "[stored]" : undefined,
    refreshToken: profile.refreshToken ? "[stored]" : undefined,
    auth: {
      ...profile.auth,
      password: profile.auth.password ? "[stored]" : undefined,
    },
    default: config.defaultProfileName === profileKey,
  });
}

export async function useProfile(profileName: string): Promise<void> {
  await setDefaultProfile(profileName);
  writeSuccess({
    profile: profileName,
    default: true,
  });
}

export async function deleteProfile(profileName: string): Promise<void> {
  await removeProfile(profileName);
  writeSuccess({
    profile: profileName,
    removed: true,
  });
}

export async function addProfile(): Promise<void> {
  const profile = await createProfile();
  writeSuccess({
    profile: profile.name,
    saved: true,
  });
}

export async function createProfile(): Promise<StoredProfile> {
  const config = await loadConfig();

  if (!config.app) {
    throw new CliError("No app is configured yet. Run `wca-cli setup` first.");
  }

  const profile = await promptForNewProfile();

  config.profiles[profile.name] = profile;
  await saveConfig(config);

  return profile;
}

export async function loginExistingProfile(profileName: string): Promise<void> {
  const profile = await loginProfile(profileName);
  writeSuccess({
    profile: profile.name,
    loggedIn: true,
  });
}

export function registerProfileCommands(program: Command): void {
  const profile = program.command("profile").description("Manage auth profiles");

  profile.command("list").description("List profiles").action(async () => {
    await listProfiles();
  });

  profile.command("show")
    .description("Show one profile")
    .argument("[name]", "Profile name")
    .action(async (name?: string) => {
      await showProfile(name);
    });

  profile.command("add").description("Add a profile").action(async () => {
    await addProfile();
  });

  profile.command("use")
    .description("Set the default profile")
    .argument("<name>", "Profile name")
    .action(async (name: string) => {
      await useProfile(name);
    });

  profile.command("login")
    .description("Log in an existing profile")
    .argument("<name>", "Profile name")
    .action(async (name: string) => {
      await loginExistingProfile(name);
    });

  profile.command("remove")
    .description("Remove a profile")
    .argument("<name>", "Profile name")
    .action(async (name: string) => {
      await deleteProfile(name);
    });
}
