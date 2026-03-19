import { loadConfig, saveConfig } from "../config/store.ts";
import { CliError } from "../core/errors.ts";
import type { StoredApp, StoredProfile, TokenResponse } from "../core/types.ts";
import {
  createAuthorizationUrl,
  exchangeCodeForToken,
  exchangePasswordForToken,
  fetchCurrentUser,
} from "../wca/api.ts";
import { printLine, prompt } from "../ui/prompts.ts";

function applyToken(profile: StoredProfile, token: TokenResponse): StoredProfile {
  const expiresAt =
    typeof token.expires_in === "number"
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : undefined;

  return {
    ...profile,
    accessToken: token.access_token,
    tokenType: token.token_type,
    expiresAt,
    updatedAt: new Date().toISOString(),
  };
}

function requireApp(config: Awaited<ReturnType<typeof loadConfig>>, profile: StoredProfile): StoredApp {
  if (!profile.appName) {
    throw new CliError(`Profile "${profile.name}" is not linked to an app.`);
  }

  const app = config.apps[profile.appName];

  if (!app) {
    throw new CliError(`App "${profile.appName}" was not found for profile "${profile.name}".`);
  }

  return app;
}

export async function loginProfile(profileName: string): Promise<StoredProfile> {
  const config = await loadConfig();
  const existing = config.profiles[profileName];

  if (!existing) {
    throw new CliError(`Unknown profile "${profileName}".`);
  }

  let updated = { ...existing };

  if (updated.auth.strategy === "access-token") {
    if (!updated.accessToken) {
      updated.accessToken = await prompt("Access token");
      updated.updatedAt = new Date().toISOString();
    }
  } else if (updated.auth.strategy === "password") {
    const app = requireApp(config, updated);
    const email = updated.auth.email ?? (await prompt("WCA email"));
    const password = updated.auth.password ?? (await prompt("WCA password", { secret: true }));
    const token = await exchangePasswordForToken({
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      email,
      password,
    });
    updated = applyToken(
      {
        ...updated,
        auth: {
          ...updated.auth,
          email,
          password,
        },
      },
      token,
    );
  } else if (updated.auth.strategy === "oauth-code") {
    const app = requireApp(config, updated);
    const authorizationUrl = createAuthorizationUrl({
      clientId: app.clientId,
      redirectUri: app.redirectUri,
    });

    printLine("Open this URL in your browser and authorize the app:");
    printLine(authorizationUrl);
    const code = await prompt("Authorization code");
    const token = await exchangeCodeForToken({
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      redirectUri: app.redirectUri,
      code,
    });
    updated = applyToken(updated, token);
  }

  config.profiles[profileName] = updated;
  await saveConfig(config);
  return updated;
}

export async function resolveProfile(profileName?: string): Promise<StoredProfile> {
  const config = await loadConfig();
  const selectedName = profileName ?? config.defaultProfileName;

  if (!selectedName) {
    throw new CliError("No profile selected. Run `wca-cli setup` or `wca-cli profile use <name>`.");
  }

  const profile = config.profiles[selectedName];

  if (!profile) {
    throw new CliError(`Unknown profile "${selectedName}".`);
  }

  return profile;
}

export async function requireAccessToken(profileName?: string): Promise<string> {
  const profile = await resolveProfile(profileName);

  if (!profile.accessToken) {
    throw new CliError(
      `Profile "${profile.name}" is not logged in. Run \`wca-cli profile login ${profile.name}\`.`,
    );
  }

  return profile.accessToken;
}

export async function getCurrentUser(profileName?: string) {
  const accessToken = await requireAccessToken(profileName);
  return fetchCurrentUser(accessToken);
}
