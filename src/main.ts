import { CliError } from "./core/errors.ts";
import { runCli } from "./cli/router.ts";

export async function main(args: string[]): Promise<void> {
  try {
    await runCli(args);
  } catch (error) {
    if (error instanceof CliError) {
      console.error(error.message);
      process.exit(error.exitCode);
    }

    console.error(error);
    process.exit(1);
  }
}
