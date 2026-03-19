import { isCancel } from "@clack/prompts";
import { confirm as clackConfirm, password as clackPassword, select as clackSelect, text } from "@clack/prompts";
import pc from "picocolors";
import { CliError } from "./errors.ts";
import { writeJson, writeStderrLine } from "./output.ts";

export interface PromptOptions {
  defaultValue?: string;
  allowEmpty?: boolean;
  secret?: boolean;
}

function formatLabel(label: string, defaultValue?: string): string {
  return defaultValue ? `${label} [${defaultValue}]: ` : `${label}: `;
}

export async function prompt(label: string, options: PromptOptions = {}): Promise<string> {
  if (options.secret) {
    return promptSecret(label, options);
  }

  const answer = await text({
    message: pc.cyan(label),
    defaultValue: options.defaultValue,
    initialValue: options.defaultValue,
    validate(value) {
      if (!value && !options.allowEmpty) {
        return `${label} is required.`;
      }

      return undefined;
    },
  });

  if (isCancel(answer)) {
    throw new CliError("Prompt cancelled.", 130);
  }

  return answer || options.defaultValue || "";
}

async function promptSecret(label: string, options: PromptOptions): Promise<string> {
  const answer = await clackPassword({
    message: pc.cyan(label),
    validate(value) {
      if (!value && !options.allowEmpty) {
        return `${label} is required.`;
      }

      return undefined;
    },
  });

  if (isCancel(answer)) {
    throw new CliError("Prompt cancelled.", 130);
  }

  return answer || options.defaultValue || "";
}

export async function select<T extends string>(
  label: string,
  options: readonly T[],
  defaultValue?: T,
): Promise<T> {
  const answer = await clackSelect({
    message: pc.cyan(label),
    options: options.map((option) => ({
      value: option,
      label: String(option),
    })) as never,
    initialValue: defaultValue,
  });

  if (isCancel(answer)) {
    throw new CliError("Prompt cancelled.", 130);
  }

  return answer as T;
}

export async function confirm(label: string, defaultValue = true): Promise<boolean> {
  const answer = await clackConfirm({
    message: pc.cyan(label),
    initialValue: defaultValue,
  });

  if (isCancel(answer)) {
    throw new CliError("Prompt cancelled.", 130);
  }

  return answer;
}

export function printJson(value: unknown): void {
  writeJson(value);
}

export function printLine(message: string): void {
  writeStderrLine(message);
}
