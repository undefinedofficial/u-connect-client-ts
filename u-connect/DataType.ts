/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */
import type { Status } from "./Status";

export const enum DataType {
  /** Received */
  CONNECT = 1,
  /** Received */
  DISCONNECT = 2,

  /**
   * Unary request sent from client, single response received from server.
   */
  UNARY_CLIENT = 3,

  /** Received */
  UNARY_SERVER = 4,

  /**
   * Request sent from client for creating a stream or sending data in stream.
   */
  STREAM_CLIENT = 5,

  /**
   * Response received from server for creating a stream or receiving data in stream.
   */
  STREAM_SERVER = 6,

  /**
   * Request sent to the server for creating a full duplex stream.
   */
  STREAM_DUPLEX = 7,

  /**
   * Notifies Stream data end of sent from client or server.
   */
  STREAM_END = 8,

  /**
   * Abort any pending request or stream.
   */
  ABORT = 9
}

export type RequestMeta<T = Record<string, string>> = T;

export type ResponseMeta<T = Record<string, string>> = Readonly<T>;

export type TransportData<T> = T | Record<string, any>;

/**                                  service */
export type ServicePath = `${string}/${string}` | string;
/*                                                                                                service.method */
export type ServiceMethod<P extends ServicePath, K extends keyof Record<string, any>> = `${P}.${K}`;

export type TransportError = string;

export interface ServerResponse<O, M> {
  method: M;
  status: Status;
  error?: TransportError | null;
  meta?: ResponseMeta | null;
  response: O;
}

/**
 * Unary request from client, single response from server
 */
export interface UnaryResponse<D> {
  method: ServiceMethod<ServicePath, string>;
  status: Status;
  meta?: ResponseMeta | null;
  response: D;
}

/**
 * Stream requests from client, single response from server
 */
export interface IClientStream<I, O, M = string> {
  send(data: I): Promise<void>;
  complete(): Promise<ServerResponse<O, M>>;
}

/**
 * Unary request from client, server stream response.
 */
export interface IServerStream<O, M = string> {
  onError: (callback: (error: Error) => void) => void;
  onMessage: (callback: (data: O) => void) => void;
  onEnd: (callback: (result: ServerResponse<null | undefined, M>) => void) => void;
}

/**
 * Duplex request from client, duplex response from server
 */
export interface IDuplexStream<I, O, M = string> extends IClientStream<I, O, M>, IServerStream<O, M> {}

interface IPackage<S extends ServicePath, D extends string> {
  id: string;
  type: DataType;
  method: ServiceMethod<S, D>;
}

export interface PackageClient<S extends ServicePath, D extends string, P> extends IPackage<S, D> {
  request?: P;
  meta?: ResponseMeta | null;
}
export interface PackageServer<S extends ServicePath, D extends string, P> extends IPackage<S, D> {
  response?: P | null;
  status?: Status;
  meta?: ResponseMeta | null;
  error?: TransportError | null;
}
