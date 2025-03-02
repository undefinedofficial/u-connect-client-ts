/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

import type { Status } from "./Status";

export class MethodError extends Error {
  constructor(public status: Status, message: string) {
    super(message);
    this.name = "MethodError";
  }
}
