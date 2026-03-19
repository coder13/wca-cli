import { CliError } from "../core/errors.ts";
import { WCA_BASE_URL } from "../core/types.ts";
import type { TokenResponse, WcaMe } from "../core/types.ts";

export interface AuthorizationUrlOptions {
  clientId: string;
  redirectUri: string;
  scope?: string;
}

export interface PasswordTokenOptions {
  clientId: string;
  clientSecret?: string;
  email: string;
  password: string;
}

export interface AuthorizationCodeTokenOptions {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  code: string;
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, WCA_BASE_URL), init);

  if (!response.ok) {
    const body = await response.text();
    throw new CliError(`WCA API request failed (${response.status}): ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}

export function createAuthorizationUrl(options: AuthorizationUrlOptions): string {
  const url = new URL("/oauth/authorize", WCA_BASE_URL);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", options.scope ?? "public");
  return url.toString();
}

export async function exchangePasswordForToken(
  options: PasswordTokenOptions,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "password",
    username: options.email,
    password: options.password,
    client_id: options.clientId,
  });

  if (options.clientSecret) {
    body.set("client_secret", options.clientSecret);
  }

  return requestJson<TokenResponse>("/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function exchangeCodeForToken(
  options: AuthorizationCodeTokenOptions,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: options.clientId,
    code: options.code,
    redirect_uri: options.redirectUri,
  });

  if (options.clientSecret) {
    body.set("client_secret", options.clientSecret);
  }

  return requestJson<TokenResponse>("/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function fetchCurrentUser(accessToken: string): Promise<WcaMe> {
  return requestJson<WcaMe>("/api/v0/me", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
