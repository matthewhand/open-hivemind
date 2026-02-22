/**
 * Error type interfaces for adapter packages.
 * These are type-only imports to avoid circular dependencies.
 */
export interface IErrorTypes {
    HivemindError: typeof Error;
    ConfigError: typeof Error;
    NetworkError: typeof Error;
    AuthenticationError: typeof Error;
}
