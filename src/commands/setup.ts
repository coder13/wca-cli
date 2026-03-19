import type { Command } from "commander";
import { intro, note, outro } from "@clack/prompts";
import pc from "picocolors";
import { loginProfile } from "../lib/auth/service.ts";
import { loadConfig, saveConfig } from "../lib/config/store.ts";
import { CliError } from "../lib/errors.ts";
import { confirm, printLine, prompt } from "../lib/prompts.ts";
import { installSkill } from "../lib/skill/install.ts";
import { DEFAULT_OAUTH_SCOPES, DEFAULT_REDIRECT_URI, WCA_BASE_URL } from "../lib/types.ts";
import type { AuthStrategy, StoredApp, StoredProfile } from "../lib/types.ts";
import { promptForNewProfile } from "./profile.ts";

function now(): string {
  return new Date().toISOString();
}

type SetupOptions = {
  nonInteractive?: boolean;
  installSkill?: boolean;
  // App config
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string;
  // Profile
  profileName?: string;
  profileStrategy?: AuthStrategy;
  profileEmail?: string;
  profilePassword?: string;
  login?: boolean;
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function boolEnv(name: string): boolean | undefined {
  const v = env(name);
  if (!v) return undefined;
  return ["1", "true", "yes", "y", "on"].includes(v.toLowerCase());
}

function resolveSetupOptions(raw: SetupOptions): SetupOptions {
  return {
    ...raw,
    installSkill: raw.installSkill ?? boolEnv("WCA_CLI_INSTALL_SKILL"),
    baseUrl: raw.baseUrl ?? env("WCA_BASE_URL"),
    clientId: raw.clientId ?? env("WCA_CLIENT_ID"),
    clientSecret: raw.clientSecret ?? env("WCA_CLIENT_SECRET"),
    redirectUri: raw.redirectUri ?? env("WCA_REDIRECT_URI"),
    scopes: raw.scopes ?? env("WCA_SCOPES"),
    profileName: raw.profileName ?? env("WCA_PROFILE_NAME"),
    profileStrategy: raw.profileStrategy ?? (env("WCA_AUTH_STRATEGY") as AuthStrategy | undefined),
    profileEmail: raw.profileEmail ?? env("WCA_EMAIL"),
    profilePassword: raw.profilePassword ?? env("WCA_PASSWORD"),
    login: raw.login ?? boolEnv("WCA_CLI_LOGIN"),
  };
}

export async function runSetup(opts: SetupOptions = {}): Promise<void> {
  const options = resolveSetupOptions(opts);

  intro(pc.cyan("wca-cli setup"));

  if (options.nonInteractive) {
    await runSetupNonInteractive(options);
    return;
  }

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

async function runSetupNonInteractive(options: SetupOptions): Promise<void> {
  const config = await loadConfig();
  const timestamp = now();

  const baseUrl = options.baseUrl ?? config.app?.baseUrl ?? WCA_BASE_URL;
  const clientId = options.clientId ?? config.app?.clientId;
  const clientSecret = options.clientSecret ?? config.app?.clientSecret;
  const redirectUri = options.redirectUri ?? config.app?.redirectUri ?? DEFAULT_REDIRECT_URI;
  const scopes = options.scopes ?? config.app?.scopes ?? DEFAULT_OAUTH_SCOPES;

  if (!clientId) {
    throw new CliError(
      "Non-interactive setup requires WCA_CLIENT_ID (or an existing saved app).",
    );
  }
  if (!clientSecret) {
    throw new CliError(
      "Non-interactive setup requires WCA_CLIENT_SECRET (or an existing saved app).",
    );
  }

  const nextApp: StoredApp = {
    baseUrl,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    createdAt: config.app?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const appWasUpdated = JSON.stringify(nextApp) !== JSON.stringify(config.app);
  config.app = nextApp;

  if (options.installSkill ?? false) {
    const targetDir = await installSkill();
    printLine(`Installed skill to ${targetDir}.`);
  }

  if (options.profileName) {
    const profile = buildProfileFromOptions(options);
    config.profiles[profile.name] = profile;
    config.defaultProfileName = profile.name;
  }

  await saveConfig(config);

  if (options.login && options.profileName) {
    await loginProfile(options.profileName);
  }

  const appMessage = appWasUpdated ? "Saved app configuration." : "Using saved app configuration.";
  const profileMessage = options.profileName
    ? ` Default profile: "${options.profileName}".`
    : "";

  outro(pc.green(`${appMessage}${profileMessage}`));
}

function buildProfileFromOptions(options: SetupOptions): StoredProfile {
  const name = options.profileName;
  if (!name) {
    throw new CliError("profileName is required");
  }

  const strategy = options.profileStrategy ?? "oauth-code";

  if (strategy === "password") {
    if (!options.profileEmail) throw new CliError("WCA_EMAIL is required for password auth.");
    if (!options.profilePassword) throw new CliError("WCA_PASSWORD is required for password auth.");
  }

  const timestamp = now();

  return {
    name,
    auth: {
      strategy,
      email: strategy === "password" ? options.profileEmail : undefined,
      password: strategy === "password" ? options.profilePassword : undefined,
    },
    accessToken: undefined,
    refreshToken: undefined,
    tokenType: undefined,
    expiresAt: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function registerSetupCommand(program: Command): void {
  program
    .command("setup")
    .description("Set up app + (optional) default profile")
    .option("--non-interactive", "Run without prompts (use flags or env vars)")
    .option("--install-skill", "Install the bundled agent skill (non-interactive only)")
    .option("--base-url <url>", "WCA base URL (default: https://www.worldcubeassociation.org)")
    .option("--client-id <id>", "OAuth client id")
    .option("--client-secret <secret>", "OAuth client secret")
    .option("--redirect-uri <uri>", "OAuth redirect URI")
    .option("--scopes <scopes>", "OAuth scopes (space-separated)")
    .option("--profile <name>", "Create/update a profile with this name")
    .option("--strategy <oauth-code|password>", "Profile auth strategy")
    .option("--email <email>", "Profile email (password strategy)")
    .option("--password <password>", "Profile password (password strategy)")
    .option("--login", "Attempt to log in after saving config (requires profile)")
    .action(async (cmd) => {
      await runSetup({
        nonInteractive: Boolean(cmd.nonInteractive),
        installSkill: Boolean(cmd.installSkill),
        baseUrl: cmd.baseUrl,
        clientId: cmd.clientId,
        clientSecret: cmd.clientSecret,
        redirectUri: cmd.redirectUri,
        scopes: cmd.scopes,
        profileName: cmd.profile,
        profileStrategy: cmd.strategy,
        profileEmail: cmd.email,
        profilePassword: cmd.password,
        login: Boolean(cmd.login),
      });
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
