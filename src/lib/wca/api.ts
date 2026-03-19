import { CliError } from "../errors.ts";
import { WCA_BASE_URL } from "../types.ts";
import type { TokenResponse, WcaMe } from "../types.ts";
export { WcaOauthClient } from "./oauth-client.ts";
export {
  assertValidWcif,
  validateWcif,
  WcifValidationError,
} from "./wcif-validation.ts";
export type {
  CurrentUserPermissions,
  ExistingCompetitionEventState,
  ExistingCompetitionState,
  WcifActivity,
  WcifAdvancementCondition,
  WcifAssignment,
  WcifAvatar,
  WcifCompetition,
  WcifCompetitionEvent,
  WcifCutoff,
  WcifExtension,
  WcifPerson,
  WcifRegistration,
  WcifRoom,
  WcifRound,
  WcifRoundResult,
  WcifRoundResultsAttempt,
  WcifSchedule,
  WcifSeries,
  WcifTimeLimit,
  WcifValidationContext,
  WcifValidationIssue,
  WcifValidationResult,
  WcifVenue,
} from "./wcif-types.ts";
export type {
  ManagedCompetitionsOptions,
  NextIfQuitOptions,
  PaymentTicketOptions,
  SearchScope,
} from "./oauth-client.ts";
export type {
  CompetitionSummary,
  CompetitionWcif,
  LiveCompetitor,
  LiveRegistrationResponse,
  LiveRoundInfo,
  LiveRoundResults,
  LiveRoundsResponse,
  MyCompetitionsResponse,
  NextIfQuitResponse,
  PaymentTicketResponse,
  PermissionsResponse,
  SearchResponse,
  RegistrationHistoryEntry,
  RegistrationLaneConfig,
  RegistrationPaymentV2,
  RegistrationPaymentsResponse,
  RegistrationUser,
  RegistrationV2,
} from "./oauth-types.ts";

export interface AuthorizationUrlOptions {
  baseUrl?: string;
  clientId: string;
  redirectUri: string;
  response_type: string;
  scope?: string;
}

export interface PasswordTokenOptions {
  baseUrl?: string;
  clientId: string;
  clientSecret?: string;
  email: string;
  password: string;
}

export interface AuthorizationCodeTokenOptions {
  baseUrl?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  code: string;
}

export interface RefreshTokenOptions {
  baseUrl?: string;
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
}

export interface WcaRequestOptions {
  baseUrl?: string;
  accessToken?: string;
  method?: string;
  body?: Blob | URLSearchParams | string;
  headers?: Record<string, string>;
}

export async function requestJson<T>(
  path: string,
  options: WcaRequestOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(new URL(path, options.baseUrl ?? WCA_BASE_URL), {
    method: options.method,
    headers,
    body: options.body,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new CliError(
      `WCA API request failed (${response.status}): ${
        body || response.statusText
      }`
    );
  }

  return (await response.json()) as T;
}

export function createAuthorizationUrl(
  options: AuthorizationUrlOptions
): string {
  const url = new URL("/oauth/authorize", options.baseUrl ?? WCA_BASE_URL);
  url.search = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: options.scope ?? "public",
  }).toString();
  return url.toString();
}

export async function exchangePasswordForToken(
  options: PasswordTokenOptions
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
    baseUrl: options.baseUrl,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function exchangeCodeForToken(
  options: AuthorizationCodeTokenOptions
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
    baseUrl: options.baseUrl,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function exchangeRefreshToken(
  options: RefreshTokenOptions
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: options.clientId,
    refresh_token: options.refreshToken,
  });

  if (options.clientSecret) {
    body.set("client_secret", options.clientSecret);
  }

  return requestJson<TokenResponse>("/oauth/token", {
    baseUrl: options.baseUrl,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function fetchCurrentUser(
  accessToken: string,
  baseUrl?: string
): Promise<WcaMe> {
  return requestJson<WcaMe>("/api/v0/me", {
    baseUrl,
    accessToken,
  });
}

export async function fetchCompetitionWcif(
  competitionId: string,
  accessToken: string
): Promise<unknown> {
  return requestJson(
    `/api/v0/competitions/${encodeURIComponent(competitionId)}/wcif`,
    {
      accessToken,
    }
  );
}
