/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */
import type { MethodError } from "./Exceptions";
import type { Status } from "./Status";

export const enum PackageType {
  /**
   * Unary request sent from client, single response received from server.
   */
  UNARY_CLIENT,

  /**
   * Request sent from client for creating a stream or sending data in stream.
   */
  STREAM_CLIENT,

  /**
   * Response received from server for creating a stream or receiving data in stream.
   */
  STREAM_SERVER,

  /**
   * Request sent to the server for creating a full duplex stream.
   */
  STREAM_DUPLEX,

  /**
   * Notifies Stream data end of sent from client or server.
   */
  STREAM_END,

  /**
   * Abort any pending request or stream.
   */
  ABORT
}

export type RequestMeta<T = Record<string, string>> = T;

export type ResponseMeta<T = Record<string, string>> = Readonly<T>;

export type TransportData<T> = T | Record<string, any>;

export type ServiceMethod = `${string}.${string}`;

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
  method: ServiceMethod;
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
  onError: (callback: (error: MethodError) => void) => IServerStream<O, M>;
  onMessage: (callback: (data: O) => void) => IServerStream<O, M>;
  onEnd: (callback: (result: ServerResponse<null | undefined, M>) => void) => IServerStream<O, M>;
}

/**
 * Duplex request from client, duplex response from server
 */
export interface IDuplexStream<I, O, M = string> extends IClientStream<I, O, M>, IServerStream<O, M> {}

interface IPackage {
  id: string;
  type: PackageType;
  method: ServiceMethod;
}

export interface PackageClient<P> extends IPackage {
  request?: P;
  meta?: ResponseMeta | null;
}
export interface PackageServer<P> extends IPackage {
  response?: P | null;
  status?: Status;
  meta?: ResponseMeta | null;
  error?: TransportError | null;
}
