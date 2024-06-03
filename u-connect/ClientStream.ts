/**
 * @u-connect/client-ts v2.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

import type { IClientStream, ServerResponse } from "./DataType";
import { DataType } from "./DataType";
import { PromiseValue } from "./utils/PromiceValue";
import type { UConnectClient } from "./websocket";

export class ClientStream<I, O, M = string> implements IClientStream<I, O, M> {
  private _result: PromiseValue<ServerResponse<O, M>>;
  private _next?: PromiseValue<void>;

  constructor(private _transport: UConnectClient, private readonly id: number, private readonly method: M) {
    this._result = new PromiseValue();
  }

  async send(data: I): Promise<void> {
    if (this._result.has()) return Promise.reject();

    this._next = new PromiseValue();
    this._transport.send({ id: this.id, type: DataType.STREAM_CLIENT, method: this.method as any, request: data });
    return this._next.value();
  }
  async complete(): Promise<ServerResponse<O, M>> {
    this._transport.send({ id: this.id, type: DataType.STREAM_END, method: this.method as any });
    return this._result.value();
  }

  result(result: ServerResponse<O, M>) {
    this._result.resolve(result);
  }

  next() {
    this._next?.resolve();
  }

  error(e: Error) {
    this._result.reject(e);
    this._next?.reject(e);
  }

  close() {
    const e = new Error("Transport closed");
    this._result.reject(e);
    this._next?.reject(e);
  }
}
