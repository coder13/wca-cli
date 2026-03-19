import jsonata from "jsonata";
import { CliError } from "./errors.ts";

export async function evaluateJsonQuery(expression: string, input: unknown): Promise<unknown> {
  try {
    const compiled = jsonata(expression);
    return await compiled.evaluate(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(`Query evaluation failed: ${message}`);
  }
}
