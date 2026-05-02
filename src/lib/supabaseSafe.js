export class DbError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "DbError";
    this.cause = cause;
  }
}

export function requireData(result, fallbackMessage = "Database request failed") {
  if (result.error) {
    throw new DbError(result.error.message || fallbackMessage, result.error);
  }
  return result.data;
}

export function rows(result, fallback = []) {
  return requireData(result) || fallback;
}

export function maybeOne(result) {
  return requireData(result) || null;
}
