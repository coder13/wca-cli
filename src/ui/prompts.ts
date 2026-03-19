import readline from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { CliError } from "../core/errors.ts";

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

  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(formatLabel(label, options.defaultValue), {
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    const value = answer || options.defaultValue || "";

    if (!value && !options.allowEmpty) {
      throw new CliError(`${label} is required.`);
    }

    return value;
  } finally {
    rl.close();
  }
}

async function promptSecret(label: string, options: PromptOptions): Promise<string> {
  if (!input.isTTY || !output.isTTY) {
    throw new CliError(`Cannot securely prompt for ${label} without a TTY.`);
  }

  const promptLabel = formatLabel(label, options.defaultValue);
  output.write(promptLabel);
  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();

  let value = "";

  try {
    while (true) {
      const chunk = await new Promise<string>((resolve) => input.once("data", resolve));

      if (chunk === "\r" || chunk === "\n") {
        output.write("\n");
        break;
      }

      if (chunk === "\u0003") {
        throw new CliError("Prompt cancelled.", 130);
      }

      if (chunk === "\u007f") {
        if (value.length > 0) {
          value = value.slice(0, -1);
        }
        continue;
      }

      value += chunk;
    }
  } finally {
    input.setRawMode(false);
    input.pause();
  }

  const resolved = value || options.defaultValue || "";

  if (!resolved && !options.allowEmpty) {
    throw new CliError(`${label} is required.`);
  }

  return resolved;
}

export async function select<T extends string>(
  label: string,
  options: readonly T[],
  defaultValue?: T,
): Promise<T> {
  const rendered = options
    .map((option, index) => `${index + 1}) ${option}`)
    .join("\n");
  output.write(`${label}\n${rendered}\n`);

  const raw = await prompt("Choose an option", {
    defaultValue: defaultValue ? String(options.indexOf(defaultValue) + 1) : undefined,
  });

  const index = Number(raw) - 1;

  if (Number.isNaN(index) || index < 0 || index >= options.length) {
    throw new CliError(`Invalid option "${raw}".`);
  }

  return options[index] as T;
}

export async function confirm(label: string, defaultValue = true): Promise<boolean> {
  const answer = await prompt(`${label} ${defaultValue ? "[Y/n]" : "[y/N]"}`, {
    allowEmpty: true,
  });
  const normalized = answer.trim().toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  if (normalized === "y" || normalized === "yes") {
    return true;
  }

  if (normalized === "n" || normalized === "no") {
    return false;
  }

  throw new CliError(`Invalid confirmation value "${answer}". Use yes or no.`);
}

export function printJson(value: unknown): void {
  output.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function printLine(message: string): void {
  output.write(`${message}\n`);
}
