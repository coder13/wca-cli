import type { Command } from "commander";
import { loadConfig } from "../lib/config/store.ts";
import { CliError } from "../lib/errors.ts";
import { writeSuccess } from "../lib/output.ts";

export async function showApp(): Promise<void> {
  const config = await loadConfig();
  const app = config.app;

  if (!app) {
    throw new CliError("No app configured.");
  }

  writeSuccess({
    ...app,
    clientSecret: app.clientSecret ? "[stored]" : undefined,
  });
}

export function registerAppCommands(program: Command): void {
  program.command("app")
    .description("Show the saved OAuth app configuration")
    .action(async () => {
      await showApp();
    });
}
