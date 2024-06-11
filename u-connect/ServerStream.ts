/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

import type { IServerStream, ServerResponse } from "./DataType";

export class ServerStream<T = any, M = string> implements IServerStream<T, M> {
  private isOpen = true;
  public InvokeEnd?: (result: ServerResponse<null | undefined, M>) => void;
  public InvokeMessage?: (data: T) => void;
  public InvokeError?: (error: Error) => void;

  onError(callback: (error: Error) => void) {
    this.InvokeError = callback;
    if (!this.isOpen) callback(new Error("Transport closed"));
  }
  onMessage(callback: (data: T) => void) {
    this.InvokeMessage = callback;
  }
  onEnd(callback: (result: ServerResponse<null | undefined, M>) => void) {
    this.InvokeEnd = callback;
  }

  close() {
    this.isOpen = false;
    this.InvokeError?.(new Error("Transport closed"));
  }
}
