declare module 'testUtils' {
    export function isSystemTest(): boolean;
    export function isUnitTest(): boolean;
    export function conditionalMock(modulePath: string, factory?: () => any): void;
    export function setupTestEnvironment(): void;
}