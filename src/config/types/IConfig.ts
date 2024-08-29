export interface IConfig {
    // Define common properties here
    API_URL?: string;
    API_KEY?: string;
    EXEC_PATH?: string;

    // Define common methods if needed
    initialize?(): void;
}
