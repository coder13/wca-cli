import type { Command } from "commander";
import { writeSuccess } from "../lib/output.ts";
import { createOauthClient } from "../lib/wca/client-factory.ts";

export function registerUserCommands(program: Command): void {
  const user = program.command("user").description("User-related API commands");

  user.command("permissions")
    .description("Fetch /api/v0/users/me/permissions")
    .option("--profile <name>", "Profile name")
    .action(async (options: { profile?: string }) => {
      const client = await createOauthClient(options.profile);
      writeSuccess(await client.myPermissions(), {
        profile: options.profile,
      });
    });
}
