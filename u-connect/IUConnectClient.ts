/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

import type { PackageClient, PackageServer, ServicePath } from "./DataType";
import { ClientService, type IService, type ServiceMethodOptions } from "./Service";
import { MethodError } from "./Exceptions";
import { Status } from "./Status";
import { DataType } from "./DataType";
import { MessagePackSerializer, type ISerializer } from "./ISerializer";
import { ConnectionState, type IConnection } from "./IConnection";
import { NextIdProvider, type IUniqueIdProvider } from "./IUniqueIdProvider";
import type { ILogger } from "./ILogger";

interface ITask<T> {
  /**
   * Callback for when a message is received from the server.
   */
  onMessage?: (data: PackageServer<any, string, T>) => void;
  /**
   * Callback for when the server ends the task.
   */
  onEnd: (data: T) => void;
  /**
   * Callback for when an error is received.
   */
  onError: (error: Error) => void;
}

export interface UConnectClientOptions {
  /**
   *
   * connection for data transfer.
   */
  connection: IConnection;

  /**
   * serializer for data serialization (optional).
   * @default MessagePackSerializer
   */
  serializer?: ISerializer;

  /**
   * id provider for unique id generation (optional).
   * @default NextIdProvider
   */
  idProvider?: IUniqueIdProvider;

  /**
   * logger instance for logging (optional).
   * @default ConsoleLogger
   */
  logger?: ILogger;
}

export interface IUConnectClient {
  connect(): Promise<IUConnectClient>;
  disconnect(): Promise<void>;

  service<S extends Record<string, any>>(id: ServicePath): IService<S>;
}

export class UConnectClient implements IUConnectClient {
  private readonly _options!: Required<UConnectClientOptions>;

  /** The connection instance */
  private readonly _socket!: IConnection;

  /** Map of tasks by id */
  private readonly _tasks: Map<string, ITask<any>>;

  public get state() {
    return this._socket.state;
  }

  constructor(options: UConnectClientOptions) {
    this._options = options as any;
    this._options.serializer ??= new MessagePackSerializer();
    this._options.idProvider ??= new NextIdProvider();

    this._tasks = new Map();
    this._socket = options.connection;
    this._socket.addEventListener("message", (data) => this.onMessage(this._options.serializer.deserialize(data)));

    this._socket.addEventListener("open", () => this._options.logger?.info("connection opened"));
    this._socket.addEventListener("error", (error) => this._options.logger?.error(error));
    this._socket.addEventListener("close", () => {
      this.dispose();
      this._options.logger?.info("connection closed");
    });
    this._socket.addEventListener("status", (state) =>
      this._options.logger?.info(`state change from ${ConnectionState[this.state]} to ${ConnectionState[state]}`)
    );
  }
  /**
   * Asynchronously establishes a WebSocket connection and returns a Promise that resolves to the Transport instance.
   * @return {Promise<Transport>} A Promise that resolves to the Transport instance when the connection is established.
   */
  async connect(): Promise<IUConnectClient> {
    if (this.state === ConnectionState.OPEN) return this;

    await this._socket.connect();
    return this;
  }

  /**
   * Disconnects the WebSocketTransport if it is not already closed.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is disconnected.
   */
  async disconnect(): Promise<void> {
    if (this.state === ConnectionState.CLOSED) return;

    this._options.logger?.info("call disconnect");
    this.dispose();

    this._socket?.close();
    return Promise.resolve();
  }

  /**
   * Creates a local namespace with the given service ID and returns remote methods for calling.
   * @param {ServicePath} id - The ID of the service.
   * @return {IService<S>} A new TransportService instance.
   */
  service<S extends Record<string, any>>(id: ServicePath): IService<S> {
    return new ClientService<S>(this, id, this._options.idProvider);
  }

  /**
   * Disposed of all tasks if the state is CLOSED.
   *
   * @return {Promise<void>} A Promise that resolves once the disposal is complete.
   */
  private dispose(): void {
    this._tasks.forEach((stream) => stream.onError(new MethodError(Status.UNAVAILABLE, "Transport closed")));
    this._tasks.clear();
  }

  /**
   * Serializes and sends a message over the WebSocket connection.
   * @param {PackageClient<string, string, I>} message - The message to send.
   */
  send<I>(message: PackageClient<string, string, I>) {
    return this._socket.send(this._options.serializer.serialize(message as PackageClient<any, string, I>));
  }

  /**
   * Sends a message to the server and waits for a response and kills the task.
   * @param message The message to send.
   * @param options The options for the message.
   */
  async sendRequest<I, O, M extends keyof Record<string, any>>(
    message: PackageClient<any, string, I>,
    options?: ServiceMethodOptions,
    onMessage?: (data: PackageServer<ServicePath, string, O>) => void
  ): Promise<PackageServer<ServicePath, M, O>> {
    /**
     * If the transport is not open, open it and wait for it to be opened before sending the message.
     */
    if (this.state !== ConnectionState.OPEN) {
      const reqProms = [this.connect()];
      // Add an abort listener if the abort option is provided. If the request is aborted, reject the promise with an error.
      // fix: hanging requests.
      if (options?.abort) {
        reqProms.push(
          new Promise((_, reject) =>
            options?.abort?.addEventListener("abort", () => reject(new MethodError(Status.ABORTED, "Request aborted")))
          )
        );
      }

      // Wait what ever the request is resolved or rejected.
      await Promise.race(reqProms);
    }

    /**
     * Add the message to the queue tasks and wait for the response
     */
    return new Promise<PackageServer<ServicePath, M, O>>((onEnd, onError) => {
      this._tasks.set(message.id, { onMessage, onEnd, onError });

      if (options?.abort || options?.timeout) {
        const abort = async (e: MethodError) => {
          const { id, method } = message;

          // fix: check and freeing task.
          if (this._tasks.delete(id)) {
            await this.send({ id, method, type: DataType.ABORT });
            onError(e);
          }
        };
        options.abort?.addEventListener("abort", () => abort(new MethodError(Status.ABORTED, "Request aborted")));

        if (options.timeout) {
          message.meta = { ...message.meta, timeout: options.timeout.toString() };
          // I know... its not critical.
          setTimeout(() => abort(new MethodError(Status.DEADLINE_EXCEEDED, "Request timed out")), options.timeout);
        }
      }
      this._options.logger?.info(`Sending request ${message.method}`);
      this.send(message as PackageClient<any, string, I>);
    });
  }

  /**
   * Handles incoming messages from the WebSocket server.
   * @param {PackageServer<any, string, any>} message - The message received from the server.
   * @return {Promise<void>} A promise that resolves when the message is handled.
   */
  private async onMessage(message: PackageServer<any, string, any>): Promise<void> {
    const task = this._tasks.get(message.id);
    switch (message.type) {
      case DataType.UNARY_CLIENT: {
        if (task) {
          this._options.logger?.info(
            `unary responce ${message.method} ${message.status}(${Status[message.status!]}) ${
              message.error ? "error message: " + message.error : "success"
            }`
          );
          this._tasks.delete(message.id);
          // If the message has an error, reject the promise with the error message and status code default to INTERNAL server error.
          if (message.error) task.onError(new MethodError(message.status ?? Status.INTERNAL, message.error));
          else task.onEnd(message);
        }
        break;
      }

      case DataType.STREAM_CLIENT:
      case DataType.STREAM_SERVER:
        if (task) {
          this._options.logger?.info("stream data " + message.method);
          task.onMessage?.(message);
        }
        break;

      case DataType.STREAM_END: {
        if (task) {
          this._options.logger?.info(
            `stream end ${message.method} ${message.status}(${Status[message.status!]}) ${
              message.error ? "error message: " + message.error : "success"
            }`
          );
          // If the message has an error, reject the promise with the error message and status code default to INTERNAL server error.
          if (message.error) task.onError(new MethodError(message.status ?? Status.INTERNAL, message.error));
          else task.onEnd(message);
          this._tasks.delete(message.id);
        }
        break;
      }

      case DataType.ABORT: {
        this._options.logger?.info(`abort request ${message.method}`);

        if (task) task.onError(new MethodError(message.status ?? Status.ABORTED, message.error ?? "Request aborted"));
        break;
      }

      default:
        this._options.logger?.error("Unknown message type: ", message);
        break;
    }
  }
}
