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
