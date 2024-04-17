import type { IServerStream, TransportResponse } from "./transport";

export class ServerStream<T = any, M = string> implements IServerStream<T, M> {
  private isOpen = true;
  public InvokeEnd?: (result: TransportResponse<null | undefined, M>) => void;
  public InvokeMessage?: (data: T) => void;
  public InvokeError?: (error: Error) => void;

  onError(callback: (error: Error) => void) {
    this.InvokeError = callback;
    if (!this.isOpen) callback(new Error("Transport closed"));
  }
  onMessage(callback: (data: T) => void) {
    this.InvokeMessage = callback;
  }
  onEnd(callback: (result: TransportResponse<null | undefined, M>) => void) {
    this.InvokeEnd = callback;
  }

  close() {
    this.isOpen = false;
    this.InvokeError?.(new Error("Transport closed"));
  }
}
