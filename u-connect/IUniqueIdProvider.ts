export interface IUniqueIdProvider {
  /**
   * Generates a unique ID for the task.
   * @return {number} The unique ID.
   */
  getId(): string;
}

/**
 * Provides a unique ID by incrementing an internal counter.
 */
export class NextIdProvider implements IUniqueIdProvider {
  /** The id of the last task */
  private _id: number;

  constructor() {
    this._id = 0;
  }

  /**
   * Generates a unique ID for the task.
   * @return {number} The unique ID.
   */
  getId(): string {
    return (++this._id).toString();
  }
}
