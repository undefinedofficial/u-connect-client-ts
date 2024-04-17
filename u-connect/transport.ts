import type { DataType } from "./DataType";
import type { Status } from "./status";

export type TransportMeta<T = Record<string, string>> = T;

export type TransportData<T> = T | Record<string, any>;

/**                                  service */
export type TranspontServicePath = `${string}/${string}` | string;
/*                                                                                                service.method */
export type TransportMethod<P extends TranspontServicePath, K extends keyof Record<string, any>> = `${P}.${K}`;

export type TransportError = string;

export interface TransportResponse<O, M> {
  method: M;
  status: Status;
  error?: TransportError | null;
  meta?: TransportMeta | null;
  response: O;
}

/**
 * Unary request from client, single response from server
 */
export interface UnaryResponse<D> {
  method: TransportMethod<TranspontServicePath, string>;
  status: Status;
  meta?: TransportMeta | null;
  response: D;
}

/**
 * Stream requests from client, single response from server
 */
export interface IClientStream<I, O, M = string> {
  send(data: I): Promise<void>;
  complete(): Promise<TransportResponse<O, M>>;
}

/**
 * Unary request from client, server stream response.
 */
export interface IServerStream<O, M = string> {
  onError: (callback: (error: Error) => void) => void;
  onMessage: (callback: (data: O) => void) => void;
  onEnd: (callback: (result: TransportResponse<null | undefined, M>) => void) => void;
}

/**
 * Duplex request from client, duplex response from server
 */
export interface IDuplexStream<I, O, M = string> extends IClientStream<I, O, M>, IServerStream<O, M> {}

/**
 * Request options
 */
export interface TransportServiceOptions {
  /**
   * Meta data for request
   */
  meta?: TransportMeta | null;
  /**
   * Abort signal for request
   */
  abort?: AbortSignal;
  /**
   * Request timeout in ms
   */
  timeout?: number;
}

type KeyOfType = keyof Record<string, any>;

interface TransportPackage<S extends TranspontServicePath, D extends KeyOfType> {
  id: number;
  type: DataType;
  method: TransportMethod<S, D>;
}

export interface TransportPackageClient<S extends TranspontServicePath, D extends KeyOfType, P> extends TransportPackage<S, D> {
  request?: P;
}
export interface TransportPackageServer<S extends TranspontServicePath, D extends KeyOfType, P> extends TransportPackage<S, D> {
  response?: P | null;
  status?: Status;
  meta?: TransportMeta | null;
  error?: TransportError | null;
}

export type TransportService<S extends Record<string, (...request: any) => any>> = {
  unary<K extends keyof S, O extends UnaryResponse<any>>(
    method: K,
    request: Parameters<S[K]>[0],
    options?: TransportServiceOptions
  ): ReturnType<S[K]> extends UnaryResponse<any> ? Promise<O> : void;

  clientStream<K extends keyof S, O extends IClientStream<any, any, K>>(
    method: K,
    options: TransportServiceOptions
  ): ReturnType<S[K]> extends IClientStream<any, any, any> ? O : void;

  serverStream<K extends keyof S, O extends IServerStream<any, S>>(
    method: K,
    request: Parameters<S[K]>[0],
    options: TransportServiceOptions
  ): ReturnType<S[K]> extends IServerStream<any, any> ? O : void;

  duplex<K extends keyof S, O extends IDuplexStream<any, any, K>>(
    method: K,
    options: TransportServiceOptions
  ): ReturnType<S[K]> extends IDuplexStream<any, any> ? O : void;
};

export interface Transport {
  connect(): Promise<Transport>;
  disconnect(): Promise<void>;

  service<S extends Record<string, any>>(id: TranspontServicePath): TransportService<S>;
}
