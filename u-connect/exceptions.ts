import type { Status } from "./status";

export class MethodError extends Error {
  constructor(public status: Status, message: string) {
    super(message);
    this.name = "MethodError";
  }
}
