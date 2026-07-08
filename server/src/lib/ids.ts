import { customAlphabet } from "nanoid";

// Short, unambiguous, uppercase QR ids (no 0/O/1/I) — e.g. "A4F2K7". These are
// what a label encodes and what the scanner resolves.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const generate = customAlphabet(alphabet, 6);

export function newQrId(): string {
  return generate();
}
