export interface IConfigAccessor {
    get<T = any>(key: string): T;
    has(key: string): boolean;
}
