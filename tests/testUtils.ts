/**
 * Test environment utilities
 */

/**
 * Checks if we're running in system test mode
 */
export function isSystemTest(): boolean {
    return process.env.RUN_SYSTEM_TESTS === 'true';
}

/**
 * Checks if we're running in unit test mode
 */
export function isUnitTest(): boolean {
    return !isSystemTest();
}

/**
 * Conditionally mocks a module based on test mode
 */
export function conditionalMock(modulePath: string, factory?: () => any) {
    if (isUnitTest()) {
        if (factory) {
            jest.mock(modulePath, factory);
        } else {
            jest.mock(modulePath);
        }
    }
}

/**
 * Sets up common test environment based on test mode
 */
export function setupTestEnvironment() {
    if (isUnitTest()) {
        // Setup any unit test specific mocks
        conditionalMock('discord.js');
    } else {
        // Clear any existing mocks for system tests
        jest.unmock('discord.js');
    }
}