import { installSkill } from "../skill/install.ts";
import { CliError } from "../core/errors.ts";
import { printLine } from "../ui/prompts.ts";

export async function runSkillCommand(subcommand: string | undefined): Promise<void> {
  switch (subcommand) {
    case "install": {
      const targetDir = await installSkill();
      printLine(`Installed wca-cli skill to ${targetDir}`);
      return;
    }
    default:
      throw new CliError("Usage: wca-cli skill install");
  }
}
