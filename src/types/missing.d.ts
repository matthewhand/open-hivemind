declare module '@hivemind/message-slack';
declare module '@hivemind/message-discord';
declare module 'async-retry' {
  function retry<T>(
    fn: (bail: (e: Error) => void, attempt: number) => Promise<T>,
    opts?: {
      retries?: number;
      factor?: number;
      minTimeout?: number;
      maxTimeout?: number;
      randomize?: boolean;
      onRetry?: (e: Error, attempt: number) => void;
    }
  ): Promise<T>;
  export = retry;
}
