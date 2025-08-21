export interface ILogger {
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
}

export class ConsoleLogger implements ILogger {
  error(...args: any[]): void {
    console.error("%c u-connect: ", "color: #ca0000;", ...args);
  }
  warn(...args: any[]): void {
    console.warn("%c u-connect: ", "color: #d8b104;", ...args);
  }
  info(...args: any[]): void {
    console.info("%c u-connect: ", "color: #42AAFF;", ...args);
  }
}
