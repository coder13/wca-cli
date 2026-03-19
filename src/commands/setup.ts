import type { Command } from "commander";
import { intro, note, outro } from "@clack/prompts";
import pc from "picocolors";
import { loginProfile } from "../lib/auth/service.ts";
import { loadConfig, saveConfig } from "../lib/config/store.ts";
import { confirm, printLine, prompt } from "../lib/prompts.ts";
import { installSkill } from "../lib/skill/install.ts";
import { DEFAULT_OAUTH_SCOPES, DEFAULT_REDIRECT_URI, WCA_BASE_URL } from "../lib/types.ts";
import type { StoredApp } from "../lib/types.ts";
import { promptForNewProfile } from "./profile.ts";

function now(): string {
  return new Date().toISOString();
}

export async function runSetup(): Promise<void> {
  intro(pc.cyan("wca-cli setup"));

  if (await confirm("Install the wca-cli agent skill into ~/.agents/skills/wca-cli first?", true)) {
    const targetDir = await installSkill();
    printLine(`Installed skill to ${targetDir}.`);
  }

  note(
    [
      "1. Install the bundled skill for agent use.",
      "2. Configure the OAuth application used by this CLI.",
      `3. Default app URL is ${WCA_BASE_URL}.`,
      `4. Recommended redirect URI is ${DEFAULT_REDIRECT_URI} for automatic local callback login.`,
      `5. Default scopes are ${DEFAULT_OAUTH_SCOPES}.`,
      "6. Optionally add a user profile under that app.",
      "7. OAuth login uses the local callback server by default and falls back to manual code entry only when needed.",
    ].join("\n"),
    "Setup flow",
  );

  const config = await loadConfig();
  const timestamp = now();
  const app = await resolveAppConfiguration(config.app, timestamp);
  const appWasUpdated = app !== config.app;

  if (appWasUpdated) {
    config.app = app;
    await saveConfig(config);
  }

  let savedProfileName: string | undefined;

  if (await confirm("Add a user profile now?", true)) {
    const profile = await promptForNewProfile(
      config.defaultProfileName ?? "default",
      config.defaultProfileName ? config.profiles[config.defaultProfileName] : undefined,
    );
    config.profiles[profile.name] = profile;
    config.defaultProfileName = profile.name;
    await saveConfig(config);
    await loginProfile(profile.name);
    savedProfileName = profile.name;
  }

  if (savedProfileName) {
    const appMessage = appWasUpdated ? "Saved app configuration" : "Using saved app configuration";
    outro(pc.green(`${appMessage} and default profile "${savedProfileName}".`));
    return;
  }

  const appMessage = appWasUpdated ? "Saved app configuration." : "Using saved app configuration.";
  outro(pc.green(`${appMessage} Add a user later with \`wca-cli auth add\`.`));
}

export function registerSetupCommand(program: Command): void {
  program.command("setup")
    .description("Interactive app + default profile setup")
    .action(async () => {
      await runSetup();
    });
}

async function configureApp(
  currentApp: StoredApp | undefined,
  timestamp: string,
): Promise<StoredApp> {
  const baseUrl = await prompt("App URL", {
    defaultValue: currentApp?.baseUrl ?? WCA_BASE_URL,
  });
  const clientId = await prompt("Client ID", { defaultValue: currentApp?.clientId });

  if (currentApp?.clientSecret) {
    printLine("Leave Client secret blank to keep the stored value.");
  }

  const clientSecret = await prompt("Client secret", {
    allowEmpty: true,
    secret: true,
    defaultValue: currentApp?.clientSecret,
  });

  return {
    baseUrl,
    clientId,
    clientSecret: clientSecret || currentApp?.clientSecret,
    redirectUri: await prompt("Redirect URI", {
      defaultValue: currentApp?.redirectUri ?? DEFAULT_REDIRECT_URI,
    }),
    scopes: await prompt("Scopes", {
      defaultValue: currentApp?.scopes ?? DEFAULT_OAUTH_SCOPES,
    }),
    createdAt: currentApp?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

async function resolveAppConfiguration(
  currentApp: StoredApp | undefined,
  timestamp: string,
): Promise<StoredApp> {
  if (!currentApp) {
    return configureApp(undefined, timestamp);
  }

  printLine(`Using saved app for ${currentApp.baseUrl}.`);

  if (!await confirm("Change the saved app configuration?", false)) {
    return currentApp;
  }

  return configureApp(currentApp, timestamp);
}
