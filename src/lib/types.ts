export const WCA_BASE_URL = "https://www.worldcubeassociation.org";
export const DEFAULT_REDIRECT_URI = "http://localhost:1339/callback";
export const DEFAULT_OAUTH_SCOPES = "public email manage_competitions";

export type AuthStrategy = "access-token" | "password" | "oauth-code";

export interface StoredApp {
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileAuthConfig {
  strategy: AuthStrategy;
  email?: string;
  password?: string;
}

export interface StoredProfile {
  name: string;
  auth: ProfileAuthConfig;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigFile {
  version: 1;
  app?: StoredApp;
  defaultProfileName?: string;
  profiles: Record<string, StoredProfile>;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  created_at?: number;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface WcaMe {
  me?: {
    id?: number;
    email?: string;
    name?: string;
    wca_id?: string;
    country_iso2?: string;
  };
  user?: {
    id?: number;
    email?: string;
    name?: string;
    wca_id?: string;
    country_iso2?: string;
  };
  [key: string]: unknown;
}
