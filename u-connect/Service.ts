/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

import type { UConnectClient } from "./IUConnectClient";
import type { IClientStream, IDuplexStream, IServerStream, RequestMeta, ServiceMethod, ServicePath, UnaryResponse } from "./DataType";
import { ServerStream } from "./ServerStream";
import { ClientStream } from "./ClientStream";
import { MethodError } from "./Exceptions";
import { DataType } from "./DataType";
import { Status } from "./Status";
import type { IUniqueIdProvider } from "./IUniqueIdProvider";

/**
 * Request options
 */
export interface ServiceMethodOptions {
  /**
   * Meta data for request
   */
  meta?: RequestMeta | null;
  /**
   * Abort signal for request
   */
  abort?: AbortSignal;
  /**
   * Request timeout in ms
   */
  timeout?: number;
}
export type IService<S extends Record<string, (...request: any) => any>> = {
  unary<K extends keyof S>(
    method: K,
    request: Parameters<S[K]>[0],
    options?: ServiceMethodOptions
  ): ReturnType<S[K]> extends UnaryResponse<any> ? Promise<ReturnType<S[K]>> : void;

  clientStream<K extends keyof S>(
    method: K,
    options?: ServiceMethodOptions
  ): ReturnType<S[K]> extends IClientStream<any, any, any> ? ReturnType<S[K]> : void;

  serverStream<K extends keyof S>(
    method: K,
    request: Parameters<S[K]>[0],
    options?: ServiceMethodOptions
  ): ReturnType<S[K]> extends IServerStream<any, any> ? ReturnType<S[K]> : void;

  duplex<K extends keyof S>(
    method: K,
    options?: ServiceMethodOptions
  ): ReturnType<S[K]> extends IDuplexStream<any, any> ? ReturnType<S[K]> : void;
};

export class ClientService<S extends Record<string, any>> implements IService<S> {
  constructor(private _transport: UConnectClient, private _service: ServicePath, private _idProvider: IUniqueIdProvider) {}

  unary<K extends keyof S>(
    method: K,
    request: Parameters<S[K]>[0],
    options?: ServiceMethodOptions
  ): ReturnType<S[K]> extends UnaryResponse<any> ? Promise<ReturnType<S[K]>> : void {
    return this._transport
      .sendRequest<Parameters<S[K]>[0], UnaryResponse<any>, string>(
        {
          id: this._idProvider.getId(),
          method: `${this._service}.${method as string}`,
          type: DataType.UNARY_CLIENT,
          request,
          meta: options?.meta
        },
        options
      )
      .then((res) => ({
        method: res.method,
        response: res.response!,
        status: res.status!,
        meta: res.meta
      })) as any;
  }

  clientStream<K extends keyof S>(
    method: K,
    options?: ServiceMethodOptions
  ): ReturnType<S[K]> extends IClientStream<any, any, any> ? ReturnType<S[K]> : void {
    const id = this._idProvider.getId();
    const fullMethod = `${this._service}.${method as string}` as ServiceMethod<string, string>;
    const clientStream = new ClientStream<any, any, string>(this._transport, id, fullMethod);

    this._transport
      .sendRequest<null | undefined, any, string>(
        { id, method: `${this._service}.${method as string}`, type: DataType.STREAM_CLIENT, request: null, meta: options?.meta },
        options,
        (data) => {
          if (data.type === DataType.STREAM_CLIENT) return clientStream.next();

          clientStream.error(new MethodError(Status.INTERNAL, "Internal server error"));
        }
      )
      .then((res) =>
        clientStream.result({
          method: res.method,
          response: res.response!,
          status: res.status!,
          meta: res.meta
        })
      )
      .catch((e) => clientStream.error(e));
    return clientStream as any;
  }

  serverStream<K extends keyof S>(
    method: K,
    request: Parameters<S[K]>[0],
    options?: ServiceMethodOptions
  ): ReturnType<S[K]> extends IServerStream<any, any> ? ReturnType<S[K]> : void {
    const stream = new ServerStream();

    this._transport
      .sendRequest<Parameters<S[K]>[0], null | undefined, string>(
        {
          id: this._idProvider.getId(),
          type: DataType.STREAM_SERVER,
          method: `${this._service}.${method as string}`,
          request,
          meta: options?.meta
        },
        options,
        (data) => {
          if (data.type === DataType.STREAM_SERVER) return stream.InvokeMessage?.(data.response);
          stream.InvokeError?.(new MethodError(Status.INTERNAL, "Internal server error"));
        }
      )
      .then((response) => stream.InvokeEnd?.(response as any))
      .catch((error) => stream.InvokeError?.(error));
    return stream as any;
  }

  duplex<K extends keyof S>(
    method: K,
    options?: ServiceMethodOptions
  ): ReturnType<S[K]> extends IDuplexStream<any, any> ? ReturnType<S[K]> : void {
    const id = this._idProvider.getId();
    const fullMethod = `${this._service}.${method as string}` as any;
    const clientStream = new ClientStream<any, any, K>(this._transport, id, fullMethod);
    const serverStream = new ServerStream<any, K>();

    const duplex = {
      complete() {
        return clientStream.complete();
      },
      send(data: any) {
        return clientStream.send(data);
      },
      onMessage(callback: any) {
        serverStream.onMessage(callback);
      },
      onError(callback: any) {
        serverStream.onError(callback);
      },
      onEnd(callback: any) {
        serverStream.onEnd(callback);
      }
    } as ReturnType<S[K]> & void;

    this._transport
      .sendRequest<null | undefined, any, string>(
        { id, method: fullMethod, type: DataType.STREAM_DUPLEX, meta: options?.meta },
        options,
        (data) => {
          if (data.type === DataType.STREAM_CLIENT) return clientStream.next();

          if (data.type === DataType.STREAM_SERVER) return serverStream.InvokeMessage?.(data.response);

          const e = new MethodError(Status.INTERNAL, "Internal server error");
          clientStream.error(e);
          serverStream.InvokeError?.(e);
        }
      )
      .then((res) => {
        const r = {
          method: res.method as any,
          response: res.response,
          status: res.status!,
          meta: res.meta
        };
        clientStream.result(r);
        serverStream.InvokeEnd?.(r);
      })
      .catch((e) => {
        clientStream.error(e);
        serverStream.InvokeError?.(e);
      });
    return duplex;
  }
}
