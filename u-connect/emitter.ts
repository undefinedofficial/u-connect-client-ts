export class EventEmitter<M extends Record<string | symbol | number, any>> {
  private _listeners: Map<keyof M, Array<(data: any) => void>> = new Map();
  public on<K extends keyof M>(event: K, listener: (data: M[K]) => void): void {
    if (!this._listeners.has(event)) this._listeners.set(event, []);

    this._listeners.get(event)?.push(listener);
  }
  public off<K extends keyof M>(event: K, listener: (data: M[K]) => void): void {
    if (!this._listeners.has(event)) return;

    const index = this._listeners.get(event)?.indexOf(listener) ?? -1;
    if (index > -1) this._listeners.get(event)?.splice(index, 1);
  }
  public once<K extends keyof M>(event: K, listener: (data: M[K]) => void): void {
    const wrapper = (data: any) => {
      listener(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
  public emit<K extends keyof M>(event: K, data: M[K]): void {
    if (!this._listeners.has(event)) return;
    this._listeners.get(event)?.forEach((listener) => listener(data));
  }
}
