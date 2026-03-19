import { createServer } from "node:http";
import { CliError } from "../errors.ts";
import { printLine } from "../prompts.ts";

const CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;

export function isLocalCallbackUrl(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "127.0.0.1" ||
        url.hostname === "localhost" ||
        url.hostname === "::1")
    );
  } catch {
    return false;
  }
}

export async function captureAuthorizationCode(
  redirectUri: string,
  authorizationUrl: string,
): Promise<string> {
  const redirectUrl = new URL(redirectUri);
  const expectedPath = redirectUrl.pathname || "/";

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new CliError("Timed out waiting for the OAuth callback."));
    }, CALLBACK_TIMEOUT_MS);

    const server = createServer((request, response) => {
      try {
        const requestUrl = new URL(request.url || "/", redirectUri);

        if (requestUrl.pathname !== expectedPath) {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }

        const code = requestUrl.searchParams.get("code");
        const error = requestUrl.searchParams.get("error");

        if (error) {
          response.statusCode = 400;
          response.setHeader("Content-Type", "text/plain; charset=utf-8");
          response.end(`OAuth failed: ${error}`);
          clearTimeout(timeout);
          server.close();
          reject(new CliError(`OAuth failed: ${error}`));
          return;
        }

        if (!code) {
          response.statusCode = 400;
          response.setHeader("Content-Type", "text/plain; charset=utf-8");
          response.end("Missing OAuth code.");
          return;
        }

        printLine("Received OAuth callback. Exchanging authorization code for tokens.");
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end("<html><body><h1>Login complete</h1><p>You can return to the terminal.</p></body></html>");
        clearTimeout(timeout);
        server.close();
        resolve(code);
      } catch (error) {
        clearTimeout(timeout);
        server.close();
        reject(error);
      }
    });

    server.on("error", (error) => {
      clearTimeout(timeout);
      reject(new CliError(`Failed to start OAuth callback server: ${(error as Error).message}`));
    });

    server.listen(Number(redirectUrl.port || 80), redirectUrl.hostname, () => {
      printLine(`Listening for OAuth callback on ${redirectUri}`);
      printLine("Open this URL in your browser and authorize the app:");
      printLine(authorizationUrl);
      printLine("Waiting for OAuth callback...");
    });
  });
}
