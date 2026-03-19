import { Command } from "commander";
import { getCurrentUser, requireAccessToken } from "../lib/auth/service.ts";
import { writeSuccess } from "../lib/output.ts";
import { registerAppCommands } from "./app.ts";
import { registerAuthCommands } from "./auth.ts";
import { registerCompetitionCommands } from "./competition.ts";
import { registerSearchCommands } from "./search.ts";
import { registerSetupCommand } from "./setup.ts";
import { registerSkillCommands } from "./skill.ts";
import { registerUserCommands } from "./user.ts";

export async function runCli(args: string[]): Promise<void> {
  const program = new Command()
    .name("wca-cli")
    .description("CLI for authenticating against and querying the World Cube Association API");

  registerSetupCommand(program);
  registerAppCommands(program);
  registerAuthCommands(program);
  registerSkillCommands(program);
  registerCompetitionCommands(program);
  registerSearchCommands(program);
  registerUserCommands(program);

  program.command("me")
    .description("Fetch /api/v0/me for a profile")
    .argument("[profile]", "Profile name")
    .action(async (profile?: string) => {
      writeSuccess(await getCurrentUser(profile), {
        profile,
      });
    });

  program.command("token")
    .description("Print a stored access token")
    .argument("[profile]", "Profile name")
    .action(async (profile?: string) => {
      writeSuccess({
        accessToken: await requireAccessToken(profile),
      }, {
        profile,
      });
    });

  await program.parseAsync(args, { from: "user" });
}
