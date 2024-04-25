import { decode, encode } from "@msgpack/msgpack";
import {
  type Transport,
  type TransportService,
  type TranspontServicePath,
  type TransportServiceOptions,
  type TransportPackageClient,
  type TransportPackageServer,
  type UnaryResponse,
  type IClientStream,
  type IServerStream,
  type IDuplexStream,
  type TransportMethod
} from "./transport";
import { MethodError } from "./exceptions";
import { Status } from "./status";
import { DataType } from "./DataType";
import { ServerStream } from "./ServerStream";
import { ClientStream } from "./ClientStream";
import { EventEmitter } from "./emitter";

class WebSocketTransportService<S extends Record<string, any>> implements TransportService<S> {
  constructor(private _transport: WebSocketTransport, private _service: TranspontServicePath) {}

  unary<K extends keyof S>(
    method: K,
    request: Parameters<S[K]>[0],
    options?: TransportServiceOptions
  ): ReturnType<S[K]> extends UnaryResponse<any> ? Promise<ReturnType<S[K]>> : void {
    return this._transport
      .sendRequest<Parameters<S[K]>[0], UnaryResponse<any>, string>(
        { id: this._transport.reservateId(), method: `${this._service}.${method as string}`, type: DataType.UNARY_CLIENT, request },
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
    options?: TransportServiceOptions
  ): ReturnType<S[K]> extends IClientStream<any, any, any> ? ReturnType<S[K]> : void {
    const id = this._transport.reservateId();
    const fullMethod = `${this._service}.${method as string}` as TransportMethod<string, string>;
    const clientStream = new ClientStream<any, any, string>(this._transport, id, fullMethod);

    this._transport
      .sendRequest<null | undefined, any, string>(
        { id, method: `${this._service}.${method as string}`, type: DataType.STREAM_CLIENT, request: null },
        options,
        (data) => {
          if (data.type === DataType.STREAM_CLIENT) {
            clientStream.next();
            return;
          }
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
    options?: TransportServiceOptions
  ): ReturnType<S[K]> extends IServerStream<any, any> ? ReturnType<S[K]> : void {
    const stream = new ServerStream();

    this._transport
      .sendRequest<Parameters<S[K]>[0], null | undefined, string>(
        { id: this._transport.reservateId(), type: DataType.STREAM_SERVER, method: `${this._service}.${method as string}`, request },
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
    options?: TransportServiceOptions
  ): ReturnType<S[K]> extends IDuplexStream<any, any> ? ReturnType<S[K]> : void {
    const id = this._transport.reservateId();
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
      .sendRequest<null | undefined, any, string>({ id, method: fullMethod, type: DataType.STREAM_DUPLEX }, options, (data) => {
        if (data.type === DataType.STREAM_CLIENT) {
          clientStream.next();
          return;
        }
        if (data.type === DataType.STREAM_SERVER) return serverStream.InvokeMessage?.(data.response);

        const e = new MethodError(Status.INTERNAL, "Internal server error");
        clientStream.error(e);
        serverStream.InvokeError?.(e);
      })
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

/**
 * WebSocketTransport connection state
 */
export enum WebSocketTransportState {
  CLOSED = 0,
  CONNECTING,
  OPEN,
  RECONNECTING
}

export interface WebSocketSerializer {
  /**
   * encoder for sending messages
   */
  encoder: (message: any, ...args: any[]) => any;

  /**
   * decoder for receiving messages
   */
  decoder: (data: any) => any;
}

export interface WebSocketTransportOptions {
  /**
   * url for websocket connection to server
   */
  url: string;

  /**
   * serializer for sending and receiving messages
   */
  serializer?: WebSocketSerializer;

  /**
   * debug mode loging (default: false)
   */
  debug?: boolean;

  /**
   * reconnect delay in ms (default: 1000) or false to disable
   */
  reconnectDelay?: number | ((reconnects: number) => number) | false;
}

interface ITransportTask<T> {
  /**
   * Callback for when a message is received from the server.
   */
  onMessage?: (data: TransportPackageServer<any, string, T>) => void;
  /**
   * Callback for when the server ends the task.
   */
  onEnd: (data: T) => void;
  /**
   * Callback for when an error is received.
   */
  onError: (error: Error) => void;
}

interface WebSocketTransportEvents {
  status: WebSocketTransportState;
}

function debugWrite(message: any) {
  console.info("%c u-connect : ", "color: #42AAFF;", message);
}

export class WebSocketTransport implements Transport {
  private readonly _options!: Required<Omit<WebSocketTransportOptions, "debug">> & Pick<WebSocketTransportOptions, "debug">;

  private readonly _emitter: EventEmitter<WebSocketTransportEvents>;

  /** The websocket instance */
  private _socket!: WebSocket;

  /** The number of reconnect attempts */
  private _attempts = 0;

  /** The id of the last task */
  private _id!: number;

  /** Map of tasks by id */
  private _tasks!: Map<number, ITransportTask<any>>;

  /** Current state of the connection */
  private _state!: WebSocketTransportState;
  public get state(): WebSocketTransportState {
    return this._state;
  }
  private set state(state: WebSocketTransportState) {
    if (this._options.debug) debugWrite(`state change from ${WebSocketTransportState[this._state]} to ${WebSocketTransportState[state]}`);

    this._state = state;
    this._emitter.emit("status", state);
  }

  constructor(options: WebSocketTransportOptions) {
    this._options = {
      reconnectDelay: 1000,
      serializer: {
        encoder: encode,
        decoder: decode
      },
      ...options
    };
    this._state = WebSocketTransportState.CLOSED;
    this._emitter = new EventEmitter();
  }
  /**
   * Asynchronously establishes a WebSocket connection and returns a Promise that resolves to the Transport instance.
   * @return {Promise<Transport>} A Promise that resolves to the Transport instance when the connection is established.
   */
  async connect(): Promise<Transport> {
    return new Promise((resolve) => {
      if (this.state === WebSocketTransportState.OPEN || this.state === WebSocketTransportState.CONNECTING) return resolve(this);

      if (this.state === WebSocketTransportState.CLOSED) this.state = WebSocketTransportState.CONNECTING;

      this._id = 0;
      this._tasks = new Map();

      this._socket = new WebSocket(this._options.url, "u-connect-web");
      this._socket.binaryType = "arraybuffer";

      /**
       * Set up a callback for when the WebSocket connection is opened.
       */
      this._socket.onopen = () => {
        this.state = WebSocketTransportState.OPEN;
        this._attempts = 0;
        if (this._options.debug) debugWrite("connected");
        resolve(this);
      };

      this._socket.onerror = (e) => {
        if (this._options.debug) debugWrite(e);
      };

      /**
       * Set up a callback for when the WebSocket connection is closed.
       */
      this._socket.onclose = async () => {
        await this.dispose();
        await this.reconnect(this._attempts++).then(resolve);
      };

      /**
       * Set up a callback for when a message is received from the server.
       */
      this._socket.onmessage = (e) => this.onMessage(this.deserialize(e.data));
    });
  }

  /**
   * Disconnects the WebSocketTransport if it is not already closed.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is disconnected.
   */
  async disconnect(): Promise<void> {
    if (this.state === WebSocketTransportState.CLOSED) return;

    if (this._options.debug) debugWrite("disconnect");
    await this.dispose();
  }

  /**
   * Creates a local namespace with the given service ID and returns remote methods for calling.
   * @param {TranspontServicePath} id - The ID of the service.
   * @return {TransportService<S>} A new TransportService instance.
   */
  service<S extends Record<string, any>>(id: TranspontServicePath): TransportService<S> {
    return new WebSocketTransportService<S>(this, id);
  }

  /**
   * Reconnects the WebSocketTransport if it is in the CLOSED state.
   * @param {number} attempt - The number of reconnect attempts made so far. Defaults to 0.
   * @return {Promise<Transport>} A Promise that resolves to the Transport instance when the reconnection is successful.
   */
  private async reconnect(attempt: number = 0): Promise<Transport> {
    if (this.state !== WebSocketTransportState.CLOSED) return this;

    this.state = WebSocketTransportState.RECONNECTING;
    const delay = typeof this._options.reconnectDelay === "function" ? this._options.reconnectDelay(attempt) : this._options.reconnectDelay;
    if (delay === false) return this;

    await new Promise((resolve) => setTimeout(resolve, delay));
    if (this._options.debug) debugWrite("connecting attempt №" + attempt);
    return this.connect();
  }

  /**
   * Dispose the WebSocketTransport by closing the tasks and socket if the state is not CLOSED.
   *
   * @return {Promise<void>} A Promise that resolves once the disposal is complete.
   */
  private async dispose(): Promise<void> {
    if (this.state === WebSocketTransportState.CLOSED) return;

    this.state = WebSocketTransportState.CLOSED;

    this._tasks.forEach((stream) => stream.onError(new Error("Transport closed")));
    this._tasks.clear();

    this._socket?.close();
  }

  /**
   * The last step in serializes a TransportPackageClient object and returns the serialized data.
   *
   * @param {TransportPackageClient<any, any, P>} options - The TransportPackageClient object to serialize.
   * @param {TransportServiceOptions} [options] - The options for the message.
   * @returns {any} - The serialized data.
   */
  private serialize<P>({ id, method, type, request }: TransportPackageClient<any, any, P>, options?: TransportServiceOptions): any {
    return this._options.serializer.encoder([id, method, type, request || null, options?.meta || null]);
  }

  /**
   * The first step in deserializes a message received over connection and returns a TransportPackageServer object.
   *
   * @param {any} message - The message to be deserialized.
   * @return {TransportPackageServer<any, any, P>} - The deserialized TransportPackageServer object.
   */
  private deserialize<P>(message: any): TransportPackageServer<any, any, P> {
    const [id, method, type, response, status, meta, error] = this._options.serializer.decoder(message);
    return { id, method, type, status, response, meta, error };
  }

  /**
   * Sends a message to the server and waits for a response and kills the task.
   * @param message The message to send.
   * @param options The options for the message.
   */
  async sendRequest<I, O, M extends keyof Record<string, any>>(
    message: TransportPackageClient<any, string, I>,
    options?: TransportServiceOptions,
    onMessage?: (data: TransportPackageServer<TranspontServicePath, string, O>) => void
  ): Promise<TransportPackageServer<TranspontServicePath, M, O>> {
    /**
     * If the transport is not open, open it and wait for it to be opened.
     */
    if (this.state === WebSocketTransportState.CLOSED) await this.connect();

    /**
     * Add the message to the queue tasks and wait for the response
     */
    return new Promise<TransportPackageServer<TranspontServicePath, M, O>>((onEnd, onError) => {
      this._tasks.set(message.id, { onMessage, onEnd, onError });

      this.send(message as TransportPackageClient<any, string, I>, options);

      if (options?.abort || options?.timeout) {
        const abort = (e: MethodError) => {
          const { id, method } = message;
          this.send({ id, method, type: DataType.ABORT });
          onError(e);
        };
        options.abort?.addEventListener("abort", () => abort(new MethodError(Status.ABORTED, "Request aborted")));

        if (options.timeout) setTimeout(() => abort(new MethodError(Status.DEADLINE_EXCEEDED, "Request timed out")), options.timeout);
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
   * Serializes and sends a message over the WebSocket connection.
   * @param {TransportPackageClient<string, string, I>} message - The message to send.
   * @param {TransportServiceOptions} [options] - The options for the message.
   */
  send<I>(message: TransportPackageClient<string, string, I>, options?: TransportServiceOptions) {
    if (this._options.debug) debugWrite("send data " + message.method);
    this._socket.send(this.serialize(message as TransportPackageClient<any, string, I>, options));
  }

  /**
   * Handles incoming messages from the WebSocket server.
   * @param {TransportPackageServer<any, string, any>} message - The message received from the server.
   * @return {Promise<void>} A promise that resolves when the message is handled.
   */
  private async onMessage(message: TransportPackageServer<any, string, any>): Promise<void> {
    const task = this._tasks.get(message.id);
    switch (message.type) {
      case DataType.UNARY_CLIENT: {
        if (task) {
          if (this._options.debug) debugWrite("unary responce " + message.method);
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
          if (this._options.debug) debugWrite("stream end " + message.method);
          // If the message has an error, reject the promise with the error message and status code default to INTERNAL server error.
          if (message.error) task.onError(new MethodError(message.status ?? Status.INTERNAL, message.error));
          else task.onEnd(message);
          this._tasks.delete(message.id);
        }
        break;
      }

      case DataType.ABORT: {
        if (this._options.debug) debugWrite("Abort request" + message.method);

        if (task) task.onError(new MethodError(message.status ?? Status.ABORTED, message.error ?? "Request aborted"));
        break;
      }

      case DataType.CONNECT:
        console.warn("type CONNECT in received");
        break;
      case DataType.DISCONNECT:
        console.warn("type DISCONNECT in received");
        break;
      case DataType.UNARY_SERVER:
        console.warn("type UNARY_SERVER in received");
        break;

      default:
        console.error("Unknown message type:", message);
        break;
    }
  }

  public on<K extends keyof WebSocketTransportEvents>(event: K, callback: (arg: WebSocketTransportEvents[K]) => any) {
    return this._emitter.on(event, callback);
  }

  public off<K extends keyof WebSocketTransportEvents>(event: K, callback: (arg: WebSocketTransportEvents[K]) => any) {
    return this._emitter.off(event, callback);
  }

  public once<K extends keyof WebSocketTransportEvents>(event: K, callback: (arg: WebSocketTransportEvents[K]) => any) {
    return this._emitter.once(event, callback);
  }
}
