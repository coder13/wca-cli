import { loadConfig, saveConfig } from "../config/store.ts";
import { DEFAULT_REDIRECT_URI } from "../core/types.ts";
import type { AuthStrategy, StoredApp, StoredProfile } from "../core/types.ts";
import { confirm, prompt, select, printLine } from "../ui/prompts.ts";
import { loginProfile } from "../auth/service.ts";
import { installSkill } from "../skill/install.ts";

function now(): string {
  return new Date().toISOString();
}

export async function runSetup(): Promise<void> {
  printLine("Create a WCA OAuth application first at https://www.worldcubeassociation.org/oauth/applications.");
  printLine("Use a redirect URI you control. For copy/paste CLI flows, the default below usually works.");

  const config = await loadConfig();
  const appName = await prompt("App name", {
    defaultValue: Object.keys(config.apps)[0] ?? "default-app",
  });
  const timestamp = now();
  const app: StoredApp = {
    name: appName,
    clientId: await prompt("Client ID"),
    clientSecret: await prompt("Client secret", { allowEmpty: true, secret: true }),
    redirectUri: await prompt("Redirect URI", { defaultValue: DEFAULT_REDIRECT_URI }),
    createdAt: config.apps[appName]?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const profileName = await prompt("Default profile name", {
    defaultValue: config.defaultProfileName ?? "default",
  });
  const strategy = await select<AuthStrategy>(
    "Authentication method",
    ["oauth-code", "password", "access-token"],
    "oauth-code",
  );

  const profile: StoredProfile = {
    name: profileName,
    appName: strategy === "access-token" ? undefined : app.name,
    auth: {
      strategy,
      email: strategy === "password" ? await prompt("WCA email") : undefined,
      password:
        strategy === "password" ? await prompt("WCA password", { secret: true }) : undefined,
    },
    accessToken:
      strategy === "access-token" ? await prompt("Access token or API key") : undefined,
    createdAt: config.profiles[profileName]?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  config.apps[appName] = {
    ...app,
    clientSecret: app.clientSecret || undefined,
  };
  config.profiles[profileName] = profile;
  config.defaultProfileName = profileName;
  await saveConfig(config);

  if (strategy !== "access-token") {
    await loginProfile(profileName);
  }

  if (await confirm("Install the wca-cli agent skill into ~/.agents/skills/wca-cli?", true)) {
    const targetDir = await installSkill();
    printLine(`Installed skill to ${targetDir}.`);
  }

  printLine(`Saved app "${appName}" and default profile "${profileName}".`);
}
