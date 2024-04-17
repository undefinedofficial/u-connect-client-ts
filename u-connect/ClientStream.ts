import { DataType } from "./DataType";
import { PromiseValue } from "./PromiceValue";
import type { IClientStream, TransportResponse } from "./transport";
import type { WebSocketTransport } from "./websocket";

export class ClientStream<I, O, M = string> implements IClientStream<I, O, M> {
  public result: PromiseValue<TransportResponse<O, M>>;
  public next?: PromiseValue<void>;

  /**
   *
   */
  constructor(private _transport: WebSocketTransport, private readonly id: number, private readonly method: M) {
    this.result = new PromiseValue();
  }

  async send(data: I): Promise<void> {
    if (this.result.has()) {
      await this.result.value();
      return;
    }
    this._transport.send({ id: this.id, type: DataType.STREAM_CLIENT, method: this.method as any, request: data });
    this.next = new PromiseValue();
    return this.next.value();
  }
  complete(): Promise<TransportResponse<O, M>> {
    this._transport.send({ id: this.id, type: DataType.STREAM_END, method: this.method as any, request: null });
    return this.result.value();
  }

  close() {
    this.result.reject(new Error("Transport closed"));
    this.next?.reject(new Error("Transport closed"));
  }
}
