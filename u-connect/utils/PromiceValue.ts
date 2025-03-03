/**
 * @u-connect/client-ts v1.0.0
 * https://github.com/undefinedofficial/u-connect-client-ts.git
 *
 * Copyright (c) 2024 https://github.com/undefinedofficial
 * Released under the MIT license
 */

/**
 * PromiseValue is a helper class that can be used to create a promise that returns the value or error of a promise and save the value or error.
 */
export class PromiseValue<T> {
  private _value?: T;
  private _error?: Error;
  private _resolve?: (value: T) => void;
  private _reject?: (error: Error) => void;
  private _task?: Promise<T>;

  /**
   * Check if the PromiseValue has a stored value or error.
   * @return {boolean} true if the PromiseValue has a stored value or error, false otherwise
   */
  has(): boolean {
    return this.hasValue() || this.hasError();
  }

  /**
   * Check if the PromiseValue has a stored value.
   * @return {boolean} true if the value is not undefined, false otherwise
   */
  hasValue(): boolean {
    return this._value !== undefined;
  }

  /**
   * Check if the PromiseValue has an error stored.
   * @return {boolean} true if the error is not undefined, false otherwise
   */
  hasError(): boolean {
    return this._error !== undefined;
  }

  /**
   * Wait for the PromiseValue to resolve.
   * @return {Promise<T>} A Promise that resolves with the value or rejects with the error.
   */
  value(): Promise<T> {
    // If the PromiseValue has a stored value or error, return it.
    if (this._value) return Promise.resolve(this._value);
    if (this._error) return Promise.reject(this._error);

    // If the PromiseValue does not have task yet, create it.
    if (!this._task)
      this._task = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });

    return this._task;
  }

  /**
   * Resolves the promise with the given value.
   * @param {T} value - The value to resolve the promise with.
   */
  resolve(value: T) {
    this._value = value;
    this._resolve?.(value);
  }

  /**
   * A method to reject the promise with an error.
   * @param {Error} error - The error to reject the promise with.
   */
  reject(error: Error) {
    this._error = error;
    this._reject?.(error);
  }
}
