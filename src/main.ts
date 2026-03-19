import { runCli } from "./commands/index.ts";
import { CliError } from "./lib/errors.ts";
import { writeError } from "./lib/output.ts";

export async function main(args: string[]): Promise<void> {
  try {
    await runCli(args);
  } catch (error) {
    if (error instanceof CliError) {
      writeError("CLI_ERROR", error.message);
      process.exit(error.exitCode);
    }

    writeError(
      "UNEXPECTED_ERROR",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
