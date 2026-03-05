/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

import type { IServerStream, ServerResponse } from "./DataType";
import { MethodError } from "./Exceptions";
import { Status } from "./Status";

export class ServerStream<T = any, M = string> implements IServerStream<T, M> {
  private isOpen = true;
  public InvokeEnd?: (result: ServerResponse<null | undefined, M>) => void;
  public InvokeMessage?: (data: T) => void;
  public InvokeError?: (error: MethodError) => void;

  onError(callback: (error: MethodError) => void) {
    this.InvokeError = callback;
    if (!this.isOpen) callback(new MethodError(Status.CANCELLED, "Transport closed"));
    return this;
  }
  onMessage(callback: (data: T) => void) {
    this.InvokeMessage = callback;
    return this;
  }
  onEnd(callback: (result: ServerResponse<null | undefined, M>) => void) {
    this.InvokeEnd = callback;
    return this;
  }

  close() {
    this.isOpen = false;
    this.InvokeError?.(new MethodError(Status.CANCELLED, "Transport closed"));
  }
}
