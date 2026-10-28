/** An error that carries the HTTP status the API should answer with. Kept dependency-free so any module can import it. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
