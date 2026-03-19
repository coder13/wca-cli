import { findProfileKey, loadConfig, saveConfig } from "../config/store.ts";
import {
  captureAuthorizationCode,
  isLocalCallbackUrl,
} from "./oauth-callback.ts";
import { CliError } from "../errors.ts";
import {
  createAuthorizationUrl,
  exchangeCodeForToken,
  exchangePasswordForToken,
  exchangeRefreshToken,
  fetchCurrentUser,
} from "../wca/api.ts";
import { printLine, prompt } from "../prompts.ts";
import type { StoredApp, StoredProfile, TokenResponse } from "../types.ts";

function applyToken(
  profile: StoredProfile,
  token: TokenResponse
): StoredProfile {
  const expiresAt =
    typeof token.expires_in === "number"
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : undefined;

  return {
    ...profile,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? profile.refreshToken,
    tokenType: token.token_type,
    expiresAt,
    updatedAt: new Date().toISOString(),
  };
}

export function requireApp(
  config: Awaited<ReturnType<typeof loadConfig>>
): StoredApp {
  const app = config.app;

  if (!app) {
    throw new CliError("No app is configured. Run `wca-cli setup` first.");
  }

  return app;
}

export async function loginProfile(
  profileName: string
): Promise<StoredProfile> {
  const config = await loadConfig();
  const profileKey = findProfileKey(config, profileName);
  const existing = profileKey ? config.profiles[profileKey] : undefined;

  if (!profileKey || !existing) {
    throw new CliError(`Unknown profile "${profileName}".`);
  }

  let updated = { ...existing };

  if (updated.auth.strategy === "access-token") {
    if (!updated.accessToken) {
      updated.accessToken = await prompt("Access token");
      updated.updatedAt = new Date().toISOString();
    }
  } else if (updated.auth.strategy === "password") {
    const app = requireApp(config);
    const email = updated.auth.email ?? (await prompt("WCA email"));
    const password =
      updated.auth.password ?? (await prompt("WCA password", { secret: true }));
    const token = await exchangePasswordForToken({
      baseUrl: app.baseUrl,
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
      token
    );
  } else if (updated.auth.strategy === "oauth-code") {
    const app = requireApp(config);
    const authorizationUrl = createAuthorizationUrl({
      baseUrl: app.baseUrl,
      clientId: app.clientId,
      redirectUri: app.redirectUri,
      response_type: "code",
      scope: app.scopes,
    });

    const code = isLocalCallbackUrl(app.redirectUri)
      ? await captureAuthorizationCode(app.redirectUri, authorizationUrl)
      : await requestManualAuthorizationCode(authorizationUrl);
    const token = await exchangeCodeForToken({
      baseUrl: app.baseUrl,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      redirectUri: app.redirectUri,
      code,
    });
    updated = applyToken(updated, token);
  }

  config.profiles[profileKey] = updated;
  await saveConfig(config);
  return updated;
}

export async function loginSelectedProfile(
  profileName?: string
): Promise<StoredProfile> {
  const profile = await resolveProfile(profileName);
  return loginProfile(profile.name);
}

export async function resolveProfile(
  profileName?: string
): Promise<StoredProfile> {
  const config = await loadConfig();
  const selectedName = profileName ?? config.defaultProfileName;

  if (!selectedName) {
    throw new CliError(
      "No profile selected. Run `wca-cli setup` or `wca-cli profile use <name>`."
    );
  }

  const profileKey = findProfileKey(config, selectedName);
  const profile = profileKey ? config.profiles[profileKey] : undefined;

  if (!profileKey || !profile) {
    throw new CliError(`Unknown profile "${selectedName}".`);
  }

  return profile;
}

export async function requireAccessToken(
  profileName?: string
): Promise<string> {
  const config = await loadConfig();
  const selectedName = profileName ?? config.defaultProfileName;

  if (!selectedName) {
    throw new CliError(
      "No profile selected. Run `wca-cli setup` or `wca-cli profile use <name>`."
    );
  }

  const profileKey = findProfileKey(config, selectedName);
  const profile = profileKey ? config.profiles[profileKey] : undefined;

  if (!profileKey || !profile) {
    throw new CliError(`Unknown profile "${selectedName}".`);
  }

  if (profile.accessToken && !isExpired(profile.expiresAt)) {
    return profile.accessToken;
  }

  const app = requireApp(config);

  if (profile.refreshToken) {
    const token = await exchangeRefreshToken({
      baseUrl: app.baseUrl,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      refreshToken: profile.refreshToken,
    });
    const updated = applyToken(profile, token);
    config.profiles[profileKey] = updated;
    await saveConfig(config);
    return updated.accessToken!;
  }

  if (!profile.accessToken) {
    throw new CliError(
      `Profile "${profile.name}" is not logged in. Run \`wca-cli profile login ${profile.name}\`.`
    );
  }

  return profile.accessToken;
}

export async function getCurrentUser(profileName?: string) {
  const config = await loadConfig();
  const app = requireApp(config);
  const accessToken = await requireAccessToken(profileName);
  return fetchCurrentUser(accessToken, app.baseUrl);
}

async function requestManualAuthorizationCode(
  authorizationUrl: string
): Promise<string> {
  printLine("Open this URL in your browser and authorize the app:");
  printLine(authorizationUrl);
  return prompt("Authorization code");
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(expiresAt).valueOf();

  if (Number.isNaN(expiresAtMs)) {
    return false;
  }

  return expiresAtMs <= Date.now() + 30_000;
}
