import { CliError } from "./errors.ts";
import { evaluateJsonQuery } from "./json-query.ts";
import { writeSuccess } from "./output.ts";

export interface JsonOutputOptions {
  query?: string;
  raw?: boolean;
  emptyQueryMessage: string;
  meta?: Record<string, unknown>;
}

export async function printJsonWithOptionalQuery(
  value: unknown,
  options: JsonOutputOptions,
): Promise<void> {
  if (options.raw) {
    writeSuccess(value, options.meta);
    return;
  }

  if (!options.query) {
    throw new CliError(options.emptyQueryMessage);
  }

  const result = await evaluateJsonQuery(options.query, value);
  writeSuccess(result, options.meta);
}
