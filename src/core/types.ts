export const WCA_BASE_URL = "https://www.worldcubeassociation.org";
export const DEFAULT_REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

export type AuthStrategy = "access-token" | "password" | "oauth-code";

export interface StoredApp {
  name: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
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
  appName?: string;
  auth: ProfileAuthConfig;
  accessToken?: string;
  tokenType?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigFile {
  version: 1;
  defaultProfileName?: string;
  apps: Record<string, StoredApp>;
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
