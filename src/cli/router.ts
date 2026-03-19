import { getCurrentUser, requireAccessToken } from "../auth/service.ts";
import { CliError } from "../core/errors.ts";
import { printJson, printLine } from "../ui/prompts.ts";
import { listApps, showApp } from "./app.ts";
import { runSkillCommand } from "./skill.ts";
import { runSetup } from "./setup.ts";
import {
  addProfile,
  deleteProfile,
  listProfiles,
  loginExistingProfile,
  showProfile,
  useProfile,
} from "./profile.ts";

export async function runCli(args: string[]): Promise<void> {
  const [command, subcommand, ...rest] = args;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "setup") {
    await runSetup();
    return;
  }

  if (command === "profile") {
    await runProfileCommand(subcommand, rest);
    return;
  }

  if (command === "app") {
    await runAppCommand(subcommand, rest);
    return;
  }

  if (command === "skill") {
    await runSkillCommand(subcommand);
    return;
  }

  if (command === "me") {
    printJson(await getCurrentUser(rest[0]));
    return;
  }

  if (command === "token") {
    printLine(await requireAccessToken(rest[0]));
    return;
  }

  throw new CliError(`Unknown command "${command}". Run \`wca-cli help\`.`);
}

async function runProfileCommand(subcommand: string | undefined, rest: string[]): Promise<void> {
  switch (subcommand) {
    case "list":
      await listProfiles();
      return;
    case "show":
      await showProfile(rest[0]);
      return;
    case "add":
      await addProfile();
      return;
    case "use":
      if (!rest[0]) {
        throw new CliError("Usage: wca-cli profile use <name>");
      }
      await useProfile(rest[0]);
      return;
    case "remove":
      if (!rest[0]) {
        throw new CliError("Usage: wca-cli profile remove <name>");
      }
      await deleteProfile(rest[0]);
      return;
    case "login":
      if (!rest[0]) {
        throw new CliError("Usage: wca-cli profile login <name>");
      }
      await loginExistingProfile(rest[0]);
      return;
    default:
      throw new CliError("Usage: wca-cli profile <list|show|add|use|remove|login>");
  }
}

async function runAppCommand(subcommand: string | undefined, rest: string[]): Promise<void> {
  switch (subcommand) {
    case "list":
      await listApps();
      return;
    case "show":
      if (!rest[0]) {
        throw new CliError("Usage: wca-cli app show <name>");
      }
      await showApp(rest[0]);
      return;
    default:
      throw new CliError("Usage: wca-cli app <list|show>");
  }
}

function printHelp(): void {
  printLine("wca-cli");
  printLine("");
  printLine("Commands:");
  printLine("  setup                     Interactive app + default profile setup");
  printLine("  app list                  List saved OAuth apps");
  printLine("  app show <name>           Show one saved app");
  printLine("  skill install             Install the bundled agent skill");
  printLine("  profile list              List profiles");
  printLine("  profile show [name]       Show one profile");
  printLine("  profile add               Add a profile");
  printLine("  profile use <name>        Set the default profile");
  printLine("  profile login <name>      Log in an existing profile");
  printLine("  profile remove <name>     Remove a profile");
  printLine("  me [profile]              Fetch /api/v0/me for a profile");
  printLine("  token [profile]           Print a stored access token");
}
