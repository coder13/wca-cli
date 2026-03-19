import { chmod, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function getInstalledSkillDirectory(): string {
  return join(homedir(), ".agents", "skills", "wca-cli");
}

export async function installSkill(): Promise<string> {
  const source = fileURLToPath(new URL("../../../skills/wca-cli/SKILL.md", import.meta.url));
  const targetDir = getInstalledSkillDirectory();
  const target = join(targetDir, "SKILL.md");

  await mkdir(dirname(target), { recursive: true });
  await mkdir(targetDir, { recursive: true });
  await copyFile(source, target);
  await chmod(target, 0o644);

  return targetDir;
}
