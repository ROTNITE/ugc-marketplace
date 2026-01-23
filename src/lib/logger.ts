type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

export function log(level: LogLevel, scope: string, fields: LogFields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
