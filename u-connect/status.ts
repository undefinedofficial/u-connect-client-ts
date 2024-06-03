/**
 * @u-connect/client-ts v2.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

export enum Status {
  /**
   * The operation completed successfully.
   */
  OK,
  /**
   * The operation was cancelled, typically by the caller.
   */
  CANCELLED,
  /**
   * Unknown error.  An example of where this error may be returned is
   * if a Status value received from another address space belongs to
   * an error-space that is not known in this address space.  Also
   * errors raised by APIs that do not return enough error information
   * may be converted to this error.
   */
  UNKNOWN,
  /**
   * Client specified an invalid argument.  Note that this differs
   * from INVALID_ARGUMENT and OUT_OF_RANGE in that it indicates
   * arguments that are problematic regardless of the state of the
   * system (e.g., a malformed file name).
   */
  INVALID_ARGUMENT,
  /**
   * Deadline expired before operation could complete.  For operations
   * that change the state of the system, this error may be returned
   * even if the operation has completed successfully.  For example, a
   * successful response from a server could have been delayed longer
   * than the deadline.
   */
  DEADLINE_EXCEEDED,
  /**
   * Some requested entity (e.g., file or directory) was not found.
   * For some entities, the error may indicate that the entity
   * does not exist or has been removed, or it may indicate that the
   * entity is not visible to the requesting user.
   */
  NOT_FOUND,
  /**
   * Some entity that we attempted to create (e.g., file or directory)
   * already exists.
   */
  ALREADY_EXISTS,
  /**
   * The caller does not have permission to execute the specified
   * operation.  PERMISSION_DENIED must not be used for rejections
   * caused by exhausting some resource (use RESOURCE_EXHAUSTED instead).
   */
  PERMISSION_DENIED,

  /**
   * Some resource has been exhausted, perhaps the entire file system is out of space.
   */
  RESOURCE_EXHAUSTED,

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
  FAILED_PRECONDITION,

  /**
   * The operation was aborted, typically due to a concurrency issue
   * such as a sequencer check failure or transaction abort.
   * See the guidelines above for deciding between FAILED_PRECONDITION,
   * ABORTED, and UNAVAILABLE.
   * ABORTED must not be used if the client can retry.
   */
  ABORTED,

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
  OUT_OF_RANGE,

  /**
   * Operation is not implemented or not supported/enabled in this service.
   */
  UNIMPLEMENTED,

  /**
   * Internal errors.  Means some invariants expected by underlying
   * system has been broken.  If you see this error,
   * something is very broken.
   */
  INTERNAL,

  /**
   * The service is currently unavailable.  This is a most likely a
   * transient condition and may be corrected by retrying with
   * a backoff.
   *
   * See the guidelines above for deciding between FAILED_PRECONDITION,
   * ABORTED, and UNAVAILABLE.
   */
  UNAVAILABLE,

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
  DATA_LOSS,

  /**
   * The request does not have valid authentication credentials for the
   * operation.
   * UNAUTHENTICATED must not be used for rejections caused by an
   * unauthenticated client.
   * This error indicates that the client must first authenticate
   * with the server.
   */
  UNAUTHENTICATED
}
