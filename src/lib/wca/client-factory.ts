import { loadConfig } from "../config/store.ts";
import { requireAccessToken, requireApp } from "../auth/service.ts";
import { WcaOauthClient } from "./api.ts";

export async function createOauthClient(profileName?: string): Promise<WcaOauthClient> {
  const config = await loadConfig();
  const accessToken = await requireAccessToken(profileName);
  const app = requireApp(config);
  return new WcaOauthClient(accessToken, app.baseUrl);
}

export function createPublicClient(baseUrl?: string): WcaOauthClient {
  return new WcaOauthClient(undefined, baseUrl);
}
