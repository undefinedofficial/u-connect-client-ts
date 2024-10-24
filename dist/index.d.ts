export declare class ClientService<S extends Record<string, any>> implements IService<S> {
    private _transport;
    private _service;
    constructor(_transport: UConnectClient, _service: ServicePath);
    unary<K extends keyof S>(method: K, request: Parameters<S[K]>[0], options?: ServiceMethodOptions): ReturnType<S[K]> extends UnaryResponse<any> ? Promise<ReturnType<S[K]>> : void;
    clientStream<K extends keyof S>(method: K, options?: ServiceMethodOptions): ReturnType<S[K]> extends IClientStream<any, any, any> ? ReturnType<S[K]> : void;
    serverStream<K extends keyof S>(method: K, request: Parameters<S[K]>[0], options?: ServiceMethodOptions): ReturnType<S[K]> extends IServerStream<any, any> ? ReturnType<S[K]> : void;
    duplex<K extends keyof S>(method: K, options?: ServiceMethodOptions): ReturnType<S[K]> extends IDuplexStream<any, any> ? ReturnType<S[K]> : void;
}

/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */
declare const enum DataType {
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

export declare interface IClient {
    readonly readyState: number;
    binaryType: "arraybuffer" | string;
    addEventListener(event: "open", listener: () => void): void;
    addEventListener(event: "close", listener: (e: {
        code: number;
        reason: string;
    }) => void): void;
    addEventListener(event: "error", listener: (e: Error) => void): void;
    addEventListener(event: "message", listener: (message: {
        data: string;
    }) => void): void;
    send(message: string): void;
    close(): void;
    new (url: string | URL, protocol: string): IClient;
}

/**
 * Stream requests from client, single response from server
 */
export declare interface IClientStream<I, O, M = string> {
    send(data: I): Promise<void>;
    complete(): Promise<ServerResponse<O, M>>;
}

/**
 * Duplex request from client, duplex response from server
 */
export declare interface IDuplexStream<I, O, M = string> extends IClientStream<I, O, M>, IServerStream<O, M> {
}

declare interface IPackage<S extends ServicePath, D extends KeyOfType> {
    id: number;
    type: DataType;
    method: ServiceMethod<S, D>;
}

/**
 * Unary request from client, server stream response.
 */
export declare interface IServerStream<O, M = string> {
    onError: (callback: (error: Error) => void) => void;
    onMessage: (callback: (data: O) => void) => void;
    onEnd: (callback: (result: ServerResponse<null | undefined, M>) => void) => void;
}

export declare type IService<S extends Record<string, (...request: any) => any>> = {
    unary<K extends keyof S>(method: K, request: Parameters<S[K]>[0], options?: ServiceMethodOptions): ReturnType<S[K]> extends UnaryResponse<any> ? Promise<ReturnType<S[K]>> : void;
    clientStream<K extends keyof S>(method: K, options?: ServiceMethodOptions): ReturnType<S[K]> extends IClientStream<any, any, any> ? ReturnType<S[K]> : void;
    serverStream<K extends keyof S>(method: K, request: Parameters<S[K]>[0], options?: ServiceMethodOptions): ReturnType<S[K]> extends IServerStream<any, any> ? ReturnType<S[K]> : void;
    duplex<K extends keyof S>(method: K, options?: ServiceMethodOptions): ReturnType<S[K]> extends IDuplexStream<any, any> ? ReturnType<S[K]> : void;
};

export declare interface IUConnectClient {
    connect(): Promise<IUConnectClient>;
    disconnect(): Promise<void>;
    service<S extends Record<string, any>>(id: ServicePath): IService<S>;
}

declare type KeyOfType = keyof Record<string, any>;

export declare class MethodError extends Error {
    status: Status;
    constructor(status: Status, message: string);
}

declare interface PackageClient<S extends ServicePath, D extends KeyOfType, P> extends IPackage<S, D> {
    request?: P;
}

declare interface PackageServer<S extends ServicePath, D extends KeyOfType, P> extends IPackage<S, D> {
    response?: P | null;
    status?: Status;
    meta?: ResponseMeta | null;
    error?: TransportError | null;
}

declare type RequestMeta<T = Record<string, string>> = T;

declare type ResponseMeta<T = Record<string, string>> = Readonly<T>;

declare interface ServerResponse<O, M> {
    method: M;
    status: Status;
    error?: TransportError | null;
    meta?: ResponseMeta | null;
    response: O;
}

declare type ServiceMethod<P extends ServicePath, K extends keyof Record<string, any>> = `${P}.${K}`;

/**
 * Request options
 */
export declare interface ServiceMethodOptions {
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

/**                                  service */
declare type ServicePath = `${string}/${string}` | string;

/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */
export declare enum Status {
    /**
     * The operation completed successfully.
     */
    OK = 0,
    /**
     * The operation was cancelled, typically by the caller.
     */
    CANCELLED = 1,
    /**
     * Unknown error.  An example of where this error may be returned is
     * if a Status value received from another address space belongs to
     * an error-space that is not known in this address space.  Also
     * errors raised by APIs that do not return enough error information
     * may be converted to this error.
     */
    UNKNOWN = 2,
    /**
     * Client specified an invalid argument.  Note that this differs
     * from INVALID_ARGUMENT and OUT_OF_RANGE in that it indicates
     * arguments that are problematic regardless of the state of the
     * system (e.g., a malformed file name).
     */
    INVALID_ARGUMENT = 3,
    /**
     * Deadline expired before operation could complete.  For operations
     * that change the state of the system, this error may be returned
     * even if the operation has completed successfully.  For example, a
     * successful response from a server could have been delayed longer
     * than the deadline.
     */
    DEADLINE_EXCEEDED = 4,
    /**
     * Some requested entity (e.g., file or directory) was not found.
     * For some entities, the error may indicate that the entity
     * does not exist or has been removed, or it may indicate that the
     * entity is not visible to the requesting user.
     */
    NOT_FOUND = 5,
    /**
     * Some entity that we attempted to create (e.g., file or directory)
     * already exists.
     */
    ALREADY_EXISTS = 6,
    /**
     * The caller does not have permission to execute the specified
     * operation.  PERMISSION_DENIED must not be used for rejections
     * caused by exhausting some resource (use RESOURCE_EXHAUSTED instead).
     */
    PERMISSION_DENIED = 7,
    /**
     * Some resource has been exhausted, perhaps the entire file system is out of space.
     */
    RESOURCE_EXHAUSTED = 8,
    /**
     * Operation was rejected because the system is not in a state
     * required for the operation's execution.  For example, directory
     * to be deleted may be non-empty, an rmdir operation is applied to
     * a non-directory, etc.
     *
     * A litmus test that may help a service implementor in deciding
     * between FAILED_PRECONDITION, ABORTED, and UNAVAILABLE:
     *  (a) Use UNAVAILABLE if the client can retry just the failing call.
     *  (b) Use ABORTED if the client should retry at a higher-level
     *      (e.g., restarting a read-modify-write sequence).
     *  (c) Use FAILED_PRECONDITION if the client should not retry
     *      until the system state has been explicitly fixed.
     *  (d) Use FAILED_PRECONDITION if the client performs conditional
     */
    FAILED_PRECONDITION = 9,
    /**
     * The operation was aborted, typically due to a concurrency issue
     * such as a sequencer check failure or transaction abort.
     * See the guidelines above for deciding between FAILED_PRECONDITION,
     * ABORTED, and UNAVAILABLE.
     * ABORTED must not be used if the client can retry.
     */
    ABORTED = 10,
    /**
     * Operation was attempted past the valid range.  E.g., seeking or
     * reading past end-of-file.
     * Unlike INVALID_ARGUMENT, this error indicates a problem that may
     * be fixed if the system state changes. For example, a 32-bit file
     * system will generate INVALID_ARGUMENT if asked to read at an
     * offset that is not in the range [0,2^32-1], but it will generate
     * OUT_OF_RANGE if asked to read from an offset past the current
     * file size.
     */
    OUT_OF_RANGE = 11,
    /**
     * Operation is not implemented or not supported/enabled in this service.
     */
    UNIMPLEMENTED = 12,
    /**
     * Internal errors.  Means some invariants expected by underlying
     * system has been broken.  If you see this error,
     * something is very broken.
     */
    INTERNAL = 13,
    /**
     * The service is currently unavailable.  This is a most likely a
     * transient condition and may be corrected by retrying with
     * a backoff.
     *
     * See the guidelines above for deciding between FAILED_PRECONDITION,
     * ABORTED, and UNAVAILABLE.
     */
    UNAVAILABLE = 14,
    /**
     * The operation was attempted past the valid range.  E.g., seeking or
     * reading past end-of-file.
     * Unlike INVALID_ARGUMENT, this error indicates a problem that may
     * be fixed if the system state changes. For example, a 32-bit file
     * system will generate INVALID_ARGUMENT if asked to read at an
     * offset that is not in the range [0,2^32-1], but it will generate
     * OUT_OF_RANGE if asked to read from an offset past the current
     * file size.
     */
    DATA_LOSS = 15,
    /**
     * The request does not have valid authentication credentials for the
     * operation.
     * UNAUTHENTICATED must not be used for rejections caused by an
     * unauthenticated client.
     * This error indicates that the client must first authenticate
     * with the server.
     */
    UNAUTHENTICATED = 16
}

declare type TransportError = string;

/**
 * WebSocketTransport connection state
 */
export declare enum TransportState {
    CLOSED = 0,
    CONNECTING = 1,
    OPEN = 2,
    RECONNECTING = 3
}

export declare class UConnectClient implements IUConnectClient {
    private readonly _options;
    private readonly _emitter;
    /** The websocket instance */
    private _socket;
    /** The number of reconnect attempts */
    private _attempts;
    private _reconnectPromises;
    /** The id of the last task */
    private _id;
    /** Map of tasks by id */
    private _tasks;
    /** Current state of the connection */
    private _state;
    get state(): TransportState;
    private set state(value);
    constructor(options: UConnectClientOptions);
    /**
     * Asynchronously establishes a WebSocket connection and returns a Promise that resolves to the Transport instance.
     * @return {Promise<Transport>} A Promise that resolves to the Transport instance when the connection is established.
     */
    connect(): Promise<IUConnectClient>;
    /**
     * Disconnects the WebSocketTransport if it is not already closed.
     * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is disconnected.
     */
    disconnect(): Promise<void>;
    /**
     * Creates a local namespace with the given service ID and returns remote methods for calling.
     * @param {ServicePath} id - The ID of the service.
     * @return {IService<S>} A new TransportService instance.
     */
    service<S extends Record<string, any>>(id: ServicePath): IService<S>;
    /**
     * Reconnects the WebSocketTransport if it is disconnected state.
     * @param {number} attempt - The number of reconnect attempts made so far. Defaults to 0.
     * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is reconnected.
     */
    private reconnect;
    /**
     * Creates the WebSocket instance.
     * @returns true if the socket new created else false the socket already exists or created.
     */
    private createSocket;
    /**
     * Dispose the WebSocketTransport by closing the tasks and socket if the state is not CLOSED.
     *
     * @return {Promise<void>} A Promise that resolves once the disposal is complete.
     */
    private dispose;
    /**
     * Serializes and sends a message over the WebSocket connection.
     * @param {PackageClient<string, string, I>} message - The message to send.
     * @param {ServiceMethodOptions} [options] - The options for the message.
     */
    send<I>(message: PackageClient<string, string, I>, options?: ServiceMethodOptions): void;
    /**
     * The last step in serializes a TransportPackageClient object and returns the serialized data.
     *
     * @param {PackageClient<any, any, P>} options - The TransportPackageClient object to serialize.
     * @param {TransportServiceOptions} [options] - The options for the message.
     * @returns {any} - The serialized data.
     */
    private serialize;
    /**
     * The first step in deserializes a message received over connection and returns a TransportPackageServer object.
     *
     * @param {any} message - The message to be deserialized.
     * @return {PackageServer<any, any, P>} - The deserialized TransportPackageServer object.
     */
    private deserialize;
    /**
     * Sends a message to the server and waits for a response and kills the task.
     * @param message The message to send.
     * @param options The options for the message.
     */
    sendRequest<I, O, M extends keyof Record<string, any>>(message: PackageClient<any, string, I>, options?: ServiceMethodOptions, onMessage?: (data: PackageServer<ServicePath, string, O>) => void): Promise<PackageServer<ServicePath, M, O>>;
    /**
     * Generates a unique ID for the task.
     * @return {number} The unique ID.
     */
    reservateId(): number;
    /**
     * Handles incoming messages from the WebSocket server.
     * @param {PackageServer<any, string, any>} message - The message received from the server.
     * @return {Promise<void>} A promise that resolves when the message is handled.
     */
    private onMessage;
    on<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any): void;
    off<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any): void;
    once<K extends keyof UConnectClientEventMap>(event: K, callback: (arg: UConnectClientEventMap[K]) => any): void;
}

declare interface UConnectClientEventMap {
    status: TransportState;
}

export declare interface UConnectClientOptions {
    /**
     * url for websocket connection to server
     */
    url: string | URL;
    /**
     * debug mode loging (default: false)
     */
    debug?: boolean;
    /**
     * reconnect delay in ms (default: 1000) or false to disable
     */
    reconnectDelay?: number | ((reconnects: number) => number) | false;
    /**
     * custom client for websocket connection (default: WebSocket browser API)
     */
    client?: IClient;
}

/**
 * Unary request from client, single response from server
 */
export declare interface UnaryResponse<D> {
    method: ServiceMethod<ServicePath, string>;
    status: Status;
    meta?: ResponseMeta | null;
    response: D;
}

export { }
