import { MethodError } from "./Exceptions";
import { Status } from "./Status";
import { PromiseValue } from "./PromiceValue";
import { EventEmitter } from "./Emitter";

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

/**
 * WebSocketTransport connection state
 */
export enum ConnectionState {
  CLOSED = 0,
  CONNECTING,
  OPEN,
  RECONNECTING
}

interface UConnectClientEventMap {
  status: ConnectionState;
  open: undefined;
  close?: void;
  error: Error;
  message: any;
}

/*
 * Transport connection interface
 */
export interface IConnection {
  state: ConnectionState;
  connect(): Promise<IConnection>;
  send(message: any): Promise<void>;
  close(): void;

  addEventListener(event: "open", listener: () => void): void;
  addEventListener(event: "close", listener: () => void): void;
  addEventListener(event: "error", listener: (e: Error) => void): void;
  addEventListener(event: "message", listener: (data: any) => void): void;
  addEventListener(event: "status", listener: (status: ConnectionState) => void): void;

  removeEventListener(event: "open", listener: () => void): void;
  removeEventListener(event: "close", listener: () => void): void;
  removeEventListener(event: "error", listener: (e: Error) => void): void;
  removeEventListener(event: "message", listener: (data: any) => void): void;
  removeEventListener(event: "status", listener: (status: ConnectionState) => void): void;
}

/**
 * WebSocketTransport connection interface
 */
export class WebSocketConnection implements IConnection {
  private _client: IClient;
  private _reconnectDelay: number | false | ((reconnects: number, e: IClientCloseEvent) => number | false) = 1000;
  private _url: string | URL;
  private _socket: IClient | null;

  private _reconnectPromise: PromiseValue<IConnection> | null;

  /** Current state of the connection */
  private _state: ConnectionState;
  public get state(): ConnectionState {
    return this._state;
  }
  private set state(state: ConnectionState) {
    if (this._state === state) return;
    // emit status change before updating state for tracking from-to values.
    this._emitter.emit("status", state);
    this._state = state;
  }

  private readonly _emitter: EventEmitter<UConnectClientEventMap>;

  constructor({
    client,
    url,
    reconnectDelay,
    debug
  }: {
    debug?: boolean;
    /**
     * url for websocket connection to server
     */
    url: string | URL;
    /**
     * reconnect delay in ms (default: 1000) or false to disable
     */
    reconnectDelay?: number | false | ((reconnects: number, e: IClientCloseEvent) => number | false);

    /**
     * custom client for websocket connection (default: WebSocket browser API)
     */
    client?: IClient;
  }) {
    if (typeof WebSocket === "undefined" && client === undefined)
      throw new Error("WebSocket API is not supported in this environment or no client was provided.");

    this._client ??= WebSocket as unknown as IClient;
    this._url = url;
    this._reconnectDelay = reconnectDelay ?? 1000;
    this._reconnectPromise = null;
    this._socket = null;

    this._emitter = new EventEmitter();
    this._state = ConnectionState.CLOSED;
  }
  /**
   * Open the WebSocketTransport.
   */
  connect(): Promise<IConnection> {
    if (this.state !== ConnectionState.RECONNECTING) this.state = ConnectionState.CONNECTING;

    if (this._reconnectPromise === null) {
      this._reconnectPromise = new PromiseValue<IConnection>();
      this.createSocket();
    }
    return this._reconnectPromise?.value();
  }
  /**
   * Sends a message to the server.
   */
  send(message: any): Promise<void> {
    this._socket?.send(message);
    return Promise.resolve();
  }
  /**
   * Closes the WebSocketTransport.
   */
  close() {
    this._state = ConnectionState.CLOSED;

    this._reconnectPromise?.reject(new MethodError(Status.UNAVAILABLE, "Transport closed"));
    this._reconnectPromise = null;

    this._socket?.close();
    this._socket = null;

    this._emitter.emit("close", void 0);
  }

  /**
   * Reconnects the WebSocketTransport if it is disconnected state.
   * @param {number} attempt - The number of reconnect attempts made so far. Defaults to 0.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is reconnected.
   */
  private async reconnect(attempt: number = 0, e: IClientCloseEvent): Promise<void> {
    if (this.state === ConnectionState.OPEN) {
      this.state = ConnectionState.RECONNECTING;
    }
    const delay = typeof this._reconnectDelay === "function" ? this._reconnectDelay(attempt, e) : this._reconnectDelay;
    if (delay === false) return;

    await new Promise((resolve) => setTimeout(resolve, delay));

    // if (this._debug) debugWrite("connecting attempt №" + attempt);
    this.createSocket(attempt);
  }

  /**
   * Creates the WebSocket instance.
   * @returns true if the socket new created else false the socket already exists or created.
   */
  private createSocket(attempt = 0): IClient {
    if (this._socket?.readyState !== 0 && this._socket?.readyState !== 1) {
      // if (this._debug) debugWrite("create socket");

      this._socket = new this._client(this._url, "u-connect-web");
      this._socket.binaryType = "arraybuffer";

      /**
       * Set up a callback for when the WebSocket connection is opened.
       */
      this._socket.addEventListener("open", () => {
        this.state = ConnectionState.OPEN;
        this._reconnectPromise?.resolve(this);
        this._reconnectPromise = null;
        this._emitter.emit("open", void 0);
      });

      this._socket.addEventListener("error", (e) => this._emitter.emit("error", e));

      /**
       * Set up a callback for when the WebSocket connection is closed.
       */
      this._socket.addEventListener("close", (e) => {
        this._emitter.emit("close", void 0);
        /**
         * If the state is CLOSED client will not attempt to reconnect (set the state to CLOSE can be called from dispose method).
         */
        if (this._state === ConnectionState.CLOSED) return;
        this.reconnect(attempt + 1, e);
      });
      this._socket.addEventListener("message", (e) => this._emitter.emit("message", e.data));
    }
    return this._socket;
  }

  public addEventListener<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any) {
    return this._emitter.on(event, callback);
  }

  public removeEventListener<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any) {
    return this._emitter.off(event, callback);
  }

  public once<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any) {
    return this._emitter.once(event, callback);
  }
}
