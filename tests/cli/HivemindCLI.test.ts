jest.mock('chalk', () => ({
    default: new Proxy({}, { get: () => () => '' })
}), { virtual: true });

jest.mock('inquirer', () => ({
    default: { prompt: jest.fn() }
}), { virtual: true });

import { HivemindCLI } from '../../src/cli/HivemindCLI';
import { BotCommandHandler } from '../../src/cli/handlers/BotCommandHandler';
import { ConfigCommandHandler } from '../../src/cli/handlers/ConfigCommandHandler';
import { DatabaseCommandHandler } from '../../src/cli/handlers/DatabaseCommandHandler';
import { ServerCommandHandler } from '../../src/cli/handlers/ServerCommandHandler';

jest.mock('../../src/cli/handlers/BotCommandHandler');
jest.mock('../../src/cli/handlers/ConfigCommandHandler');
jest.mock('../../src/cli/handlers/DatabaseCommandHandler');
jest.mock('../../src/cli/handlers/ServerCommandHandler');

describe('HivemindCLI', () => {
    let mockExit: jest.SpyInstance;
    let mockStdout: jest.SpyInstance;

    beforeEach(() => {
        mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`Process.exit called with code ${code}`);
        });
        mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should display version information and exit', () => {
        const cli = new HivemindCLI();
        expect(() => {
            cli.run(['node', 'script.js', '--version']);
        }).toThrow('Process.exit called with code 0');

        expect(mockStdout).toHaveBeenCalled();
        const output = mockStdout.mock.calls.map(args => args[0]).join('');
        expect(output).toContain('1.0.0');
    });

    it('should display help information and exit', () => {
        const cli = new HivemindCLI();
        expect(() => {
            cli.run(['node', 'script.js', '--help']);
        }).toThrow('Process.exit called with code 0');

        expect(mockStdout).toHaveBeenCalled();
        const output = mockStdout.mock.calls.map(args => args[0]).join('');
        expect(output).toContain('Usage: hivemind');
    });

    it('should initialize and setup all command handlers', () => {
        new HivemindCLI();
        expect(BotCommandHandler.prototype.setup).toHaveBeenCalled();
        expect(ConfigCommandHandler.prototype.setup).toHaveBeenCalled();
        expect(DatabaseCommandHandler.prototype.setup).toHaveBeenCalled();
        expect(ServerCommandHandler.prototype.setup).toHaveBeenCalled();
    });
});
