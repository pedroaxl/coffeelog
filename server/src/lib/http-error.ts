/** A thrown error carrying an HTTP status code, handled centrally in app.ts. */
export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);
export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
