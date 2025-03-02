/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

import { decode, encode } from "@msgpack/msgpack";
import type { PackageClient, PackageServer, ServicePath } from "./DataType";
import { ClientService, type IService, type ServiceMethodOptions } from "./Service";
import { MethodError } from "./Exceptions";
import { Status } from "./Status";
import { DataType } from "./DataType";
import { EventEmitter, PromiseValue } from "./utils/index";

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

interface UConnectClientEventMap {
  status: TransportState;
}

export interface IClientCloseEvent {
  readonly code: number;
  readonly reason: string;
  readonly wasClean: boolean;
}

export interface IClient {
  readonly readyState: number;
  binaryType: "arraybuffer" | string;
  addEventListener(event: "open", listener: () => void): void;
  addEventListener(event: "close", listener: (e: IClientCloseEvent) => void): void;
  addEventListener(event: "error", listener: (e: Error) => void): void;
  addEventListener(event: "message", listener: (message: { data: string }) => void): void;
  send(message: string): void;
  close(): void;

  new (url: string | URL, protocol: string): IClient;
}

function debugWrite(message: any) {
  console.info("%c u-connect : ", "color: #42AAFF;", message);
}

function warnWrite(message: any) {
  console.warn("%c u-connect : ", "color: #d8b104;", message);
}

function errorWrite(message: any, ...args: any[]) {
  console.error("%c u-connect : ", "color: #ca0000;", message, ...args);
}

/**
 * WebSocketTransport connection state
 */
export enum TransportState {
  CLOSED = 0,
  CONNECTING,
  OPEN,
  RECONNECTING
}

export interface UConnectClientOptions {
  /**
   * url for websocket connection to server
   */
  url: string | URL;

  /**
   * debug mode loging (default: false)
   */
  debug?: boolean;

  /**
   * reconnect delay in ms (default: 1000) or 0 to disable
   */
  reconnectDelay?: number | ((reconnects: number, e: IClientCloseEvent) => number);

  /**
   * custom client for websocket connection (default: WebSocket browser API)
   */
  client?: IClient;
}

export interface IUConnectClient {
  connect(): Promise<IUConnectClient>;
  disconnect(): Promise<void>;

  service<S extends Record<string, any>>(id: ServicePath): IService<S>;
}

export class UConnectClient implements IUConnectClient {
  private readonly _options!: Required<Omit<UConnectClientOptions, "debug">> & Pick<UConnectClientOptions, "debug">;

  private readonly _emitter: EventEmitter<UConnectClientEventMap>;

  /** The websocket instance */
  private _socket!: IClient;

  /** The number of reconnect attempts */
  private _attempts = 0;

  private _reconnectPromises: PromiseValue<IUConnectClient>[];

  /** The id of the last task */
  private _id: number;

  /** Map of tasks by id */
  private _tasks: Map<number, ITask<any>>;

  /** Current state of the connection */
  private _state: TransportState;
  public get state(): TransportState {
    return this._state;
  }
  private set state(state: TransportState) {
    if (this._options.debug) debugWrite(`state change from ${TransportState[this._state]} to ${TransportState[state]}`);

    this._state = state;
    this._emitter.emit("status", state);
  }

  constructor(options: UConnectClientOptions) {
    if (typeof WebSocket === "undefined" && options.client === undefined)
      throw new Error("WebSocket API is not supported in this environment or no client was provided.");

    this._options = {
      reconnectDelay: 1000,
      client: options.client || (WebSocket as unknown as IClient),
      ...options
    };
    this._emitter = new EventEmitter();
    this._attempts = 0;
    this._reconnectPromises = [];
    this._id = 0;
    this._tasks = new Map();
    this._state = TransportState.CLOSED;
  }
  /**
   * Asynchronously establishes a WebSocket connection and returns a Promise that resolves to the Transport instance.
   * @return {Promise<Transport>} A Promise that resolves to the Transport instance when the connection is established.
   */
  async connect(): Promise<IUConnectClient> {
    if (this.state === TransportState.OPEN) return this;

    this.state = TransportState.CONNECTING;

    const reconnectPromise = new PromiseValue<IUConnectClient>();
    this._reconnectPromises.push(reconnectPromise);

    this.createSocket();
    return reconnectPromise.value();
  }

  /**
   * Disconnects the WebSocketTransport if it is not already closed.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is disconnected.
   */
  async disconnect(): Promise<void> {
    if (this.state === TransportState.CLOSED) return;

    if (this._options.debug) debugWrite("disconnect");
    this.dispose();
    return Promise.resolve();
  }

  /**
   * Creates a local namespace with the given service ID and returns remote methods for calling.
   * @param {ServicePath} id - The ID of the service.
   * @return {IService<S>} A new TransportService instance.
   */
  service<S extends Record<string, any>>(id: ServicePath): IService<S> {
    return new ClientService<S>(this, id);
  }

  /**
   * Reconnects the WebSocketTransport if it is disconnected state.
   * @param {number} attempt - The number of reconnect attempts made so far. Defaults to 0.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is reconnected.
   */
  private async reconnect(attempt: number = 0, e: IClientCloseEvent): Promise<void> {
    if (this.state === TransportState.OPEN) {
      this._id = 0;
      this._tasks.forEach((task) => task.onError(new MethodError(Status.UNAVAILABLE, "Transport closed")));
      this._tasks.clear();

      this.state = TransportState.RECONNECTING;
    }

    const delay =
      typeof this._options.reconnectDelay === "function" ? this._options.reconnectDelay(attempt, e) : this._options.reconnectDelay;
    if (!delay) return;

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (this._options.debug) debugWrite("connecting attempt №" + attempt);
    this.createSocket();
  }

  /**
   * Creates the WebSocket instance.
   * @returns true if the socket new created else false the socket already exists or created.
   */
  private createSocket() {
    if (this._socket?.readyState !== 0 && this._socket?.readyState !== 1) {
      this._socket = new this._options.client(this._options.url, "u-connect-web");
      this._socket.binaryType = "arraybuffer";

      /**
       * Set up a callback for when the WebSocket connection is opened.
       */
      this._socket.addEventListener("open", () => {
        this.state = TransportState.OPEN;
        this._attempts = 0;
        this._reconnectPromises.forEach((p) => p.resolve(this));
        this._reconnectPromises = [];
        if (this._options.debug) debugWrite("connected");
      });

      this._socket.addEventListener("error", (e) => {
        if (this._options.debug) debugWrite(e);
      });

      /**
       * Set up a callback for when the WebSocket connection is closed.
       */
      this._socket.addEventListener("close", (e) => {
        /**
         * If the state is CLOSED client will not attempt to reconnect (set the state to CLOSE can be called from dispose method).
         */
        if (this._state === TransportState.CLOSED) return;
        this.reconnect(this._attempts++, e);
      });

      /**
       * Set up a callback for when a message is received from the server.
       */
      this._socket.addEventListener("message", (e) => this.onMessage(this.deserialize(e.data)));

      return true;
    }
    return false;
  }

  /**
   * Dispose the WebSocketTransport by closing the tasks and socket if the state is not CLOSED.
   *
   * @return {Promise<void>} A Promise that resolves once the disposal is complete.
   */
  private dispose(): void {
    if (this.state === TransportState.CLOSED) return;

    this._id = 0;
    this.state = TransportState.CLOSED;

    this._tasks.forEach((stream) => stream.onError(new MethodError(Status.UNAVAILABLE, "Transport closed")));
    this._tasks.clear();

    this._reconnectPromises.forEach((p) => p.reject(new MethodError(Status.UNAVAILABLE, "Transport closed")));
    this._reconnectPromises = [];

    this._socket?.close();
  }

  /**
   * Serializes and sends a message over the WebSocket connection.
   * @param {PackageClient<string, string, I>} message - The message to send.
   * @param {ServiceMethodOptions} [options] - The options for the message.
   */
  send<I>(message: PackageClient<string, string, I>, options?: ServiceMethodOptions) {
    if (this._options.debug) debugWrite("send data " + message.method);
    this._socket.send(this.serialize(message as PackageClient<any, string, I>, options));
  }

  /**
   * The last step in serializes a TransportPackageClient object and returns the serialized data.
   *
   * @param {PackageClient<any, any, P>} options - The TransportPackageClient object to serialize.
   * @param {TransportServiceOptions} [options] - The options for the message.
   * @returns {any} - The serialized data.
   */
  private serialize<P>({ id, method, type, request }: PackageClient<any, any, P>, options?: ServiceMethodOptions): any {
    return encode([id, method, type, request || null, options?.meta || null]);
  }

  /**
   * The first step in deserializes a message received over connection and returns a TransportPackageServer object.
   *
   * @param {any} message - The message to be deserialized.
   * @return {PackageServer<any, any, P>} - The deserialized TransportPackageServer object.
   */
  private deserialize<P>(message: any): PackageServer<any, any, P> {
    const [id, method, type, response, status, meta, error] = decode(message) as any;
    return { id, method, type, status, response, meta, error };
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
    if (this.state !== TransportState.OPEN) {
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

      this.send(message as PackageClient<any, string, I>, options);

      if (options?.abort || options?.timeout) {
        const abort = (e: MethodError) => {
          const { id, method } = message;

          // fix: check and freeing task.
          if (this._tasks.delete(id)) {
            this.send({ id, method, type: DataType.ABORT });
            onError(e);
          }
        };
        options.abort?.addEventListener("abort", () => abort(new MethodError(Status.ABORTED, "Request aborted")));

        if (options.timeout)
          // I know... its not critical.
          setTimeout(() => abort(new MethodError(Status.DEADLINE_EXCEEDED, "Request timed out")), options.timeout);
      }
    });
  }

  /**
   * Generates a unique ID for the task.
   * @return {number} The unique ID.
   */
  public reservateId(): number {
    return ++this._id;
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
          if (this._options.debug)
            debugWrite(
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
          if (this._options.debug) debugWrite("stream data " + message.method);
          task.onMessage?.(message);
        }
        break;

      case DataType.STREAM_END: {
        if (task) {
          if (this._options.debug)
            debugWrite(
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
        if (this._options.debug) debugWrite(`abort request ${message.method}`);

        if (task) task.onError(new MethodError(message.status ?? Status.ABORTED, message.error ?? "Request aborted"));
        break;
      }

      case DataType.CONNECT:
        warnWrite("type CONNECT in received");
        break;
      case DataType.DISCONNECT:
        warnWrite("type DISCONNECT in received");
        break;
      case DataType.UNARY_SERVER:
        warnWrite("type UNARY_SERVER in received");
        break;

      default:
        errorWrite("Unknown message type: ", message);
        break;
    }
  }

  public on<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any) {
    return this._emitter.on(event, callback);
  }

  public off<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any) {
    return this._emitter.off(event, callback);
  }

  public once<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any) {
    return this._emitter.once(event, callback);
  }
}
