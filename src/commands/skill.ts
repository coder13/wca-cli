import type { Command } from "commander";
import { writeSuccess } from "../lib/output.ts";
import { installSkill } from "../lib/skill/install.ts";

export async function installBundledSkill(): Promise<void> {
  const targetDir = await installSkill();
  writeSuccess({
    installed: true,
    targetDir,
  });
}

export function registerSkillCommands(program: Command): void {
  const skill = program.command("skill").description("Manage bundled skills");

  skill.command("install").description("Install the bundled agent skill").action(async () => {
    await installBundledSkill();
  });
}
