declare module 'convict' {
  interface Format {
    name: string;
    coerce: (value: any) => any;
    validate: (value: any) => void;
  }

  interface Config {
    get<K extends string>(key: K): any;
    set<K extends string>(key: K, value: any): void;
    has(key: string): boolean;
    getProperties(): any;
    validate(options?: any): void;
    loadFile(filename: string): void;
    load(config: any): void;
    addFormat(format: Format): void;
    default: any;
    env: string;
  }

  function config(schema: any): Config;
  export = config;
}

declare namespace convict {
  function addFormat(format: any): void;
  interface Schema {
    [key: string]: any;
  }
  interface Config {
    get<K extends string>(key: K): any;
    set<K extends string>(key: K, value: any): void;
    has(key: string): boolean;
    getProperties(): any;
    validate(options?: any): void;
    loadFile(filename: string): void;
    load(config: any): void;
    addFormat(format: Format): void;
  }
  interface Format {
    name: string;
    coerce: (value: any) => any;
    validate: (value: any) => void;
  }
  function config(schema: any): Config;
}

declare module 'debug' {
  interface Debugger {
    (msg: string, ...args: any[]): void;
    enabled: boolean;
  }

  function debug(namespace: string): Debugger;
  export = debug;
}

declare namespace Debug {
  const debug: import('debug').Debugger;
  interface Debugger extends import('debug').Debugger {}
}

declare module 'winston' {
  export interface Logger {
    log(level: string, message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    verbose(message: string, meta?: any): void;
  }

  export interface Winston {
    Logger: any;
    createLogger: (options: any) => Logger;
    format: any;
    transports: any;
    addColors: (colors: any) => void;
  }

  const winston: Winston;
  export = winston;
}

declare module 'winston-daily-rotate-file' {
  const DailyRotateFile: any;
  export = DailyRotateFile;
}

declare module 'express-rate-limit' {
  function rateLimit(options: any): any;
  export = rateLimit;
}

declare module 'helmet' {
  function helmet(options?: any): any;
  export = helmet;
}

declare module 'compression' {
  function compression(options?: any): any;
  export = compression;
}

declare module 'morgan' {
  function morgan(format?: string, options?: any): any;
  export = morgan;
}

declare module 'cors' {
  function cors(options?: any): any;
  export = cors;
}