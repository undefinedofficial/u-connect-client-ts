import { DataType } from "./DataType";
import { PromiseValue } from "./PromiceValue";
import type { IClientStream, TransportResponse } from "./transport";
import type { WebSocketTransport } from "./websocket";

export class ClientStream<I, O, M = string> implements IClientStream<I, O, M> {
  private _isOpen: PromiseValue<void>;
  public result: PromiseValue<TransportResponse<O, M>>;
  public next?: PromiseValue<void>;

  /**
   *
   */
  constructor(private _transport: WebSocketTransport, private readonly id: number, private readonly method: M) {
    this.result = new PromiseValue();
    this._isOpen = new PromiseValue();
  }

  async send(data: I): Promise<void> {
    if (!this._isOpen.has()) await this._isOpen.value();

    if (this.result.has()) {
      await this.result.value();
      return;
    }
    this.next = new PromiseValue();
    this._transport.send({ id: this.id, type: DataType.STREAM_CLIENT, method: this.method as any, request: data });
    return this.next.value();
  }
  async complete(): Promise<TransportResponse<O, M>> {
    if (!this._isOpen.has()) await this._isOpen.value();

    this._transport.send({ id: this.id, type: DataType.STREAM_END, method: this.method as any });
    return this.result.value();
  }

  reject(e: Error) {
    this.result.reject(e);
    this.next?.reject(e);
    this._isOpen.reject(e);
  }

  close() {
    const e = new Error("Transport closed");
    this._isOpen.reject(e);
    this.result.reject(e);
    this.next?.reject(e);
  }
}
