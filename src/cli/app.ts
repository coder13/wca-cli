import { loadConfig } from "../config/store.ts";
import { CliError } from "../core/errors.ts";
import { printJson, printLine } from "../ui/prompts.ts";

export async function listApps(): Promise<void> {
  const config = await loadConfig();
  const apps = Object.values(config.apps).sort((left, right) => left.name.localeCompare(right.name));

  if (apps.length === 0) {
    printLine("No apps configured.");
    return;
  }

  for (const app of apps) {
    printLine(`${app.name} redirectUri=${app.redirectUri}`);
  }
}

export async function showApp(appName: string): Promise<void> {
  const config = await loadConfig();
  const app = config.apps[appName];

  if (!app) {
    throw new CliError(`Unknown app "${appName}".`);
  }

  printJson({
    ...app,
    clientSecret: app.clientSecret ? "[stored]" : undefined,
  });
}
