export interface SuccessEnvelope<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export function writeSuccess<T>(data: T, meta?: Record<string, unknown>): void {
  writeJson({
    ok: true,
    data,
    ...(meta ? { meta } : {}),
  } satisfies SuccessEnvelope<T>);
}

export function writeError(code: string, message: string): void {
  writeJson({
    ok: false,
    error: {
      code,
      message,
    },
  } satisfies ErrorEnvelope);
}

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function writeStderrLine(message: string): void {
  process.stderr.write(`${message}\n`);
}
