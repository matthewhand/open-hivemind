// Import the manager and necessary mocks
const { messageResponseManager } = require('../../src/managers/messageResponseManager');
jest.mock('../../src/config/configurationManager');
const configurationManager = require('../../src/config/configurationManager');
jest.mock('../../src/utils/logger');
const messageResponseUtils = require('../../src/utils/messageResponseUtils');
jest.mock('../../src/utils/messageResponseUtils');

describe('messageResponseManager Tests', () => {
    let manager;

    beforeEach(() => {
        jest.clearAllMocks();
      
        configurationManager.getConfig.mockReturnValue({
          // Your mock config
        });
      
        // Directly mock each util function if not automatically mocked
        messageResponseUtils.getLastReplyTime = jest.fn().mockReturnValue(10000);
        messageResponseUtils.calculateDynamicFactor = jest.fn().mockReturnValue(1);
        messageResponseUtils.getReplyCount = jest.fn().mockReturnValue(0);
        messageResponseUtils.incrementReplyCount = jest.fn().mockReturnValue(null);
        messageResponseUtils.resetReplyCount = jest.fn().mockReturnValue(null);
        messageResponseUtils.logReply = jest.fn().mockReturnValue(null);
      
        manager = new messageResponseManager();
      });

    test('Base chance of unsolicited reply calculation', () => {
        const message = { channel: { id: 'channel-id' }};
        const baseChance = manager.calcBaseChanceOfUnsolicitedReply(message);
        expect(baseChance).toBe(0.4); // Expected base chance based on mock time since last reply
    });


    afterEach(() => {
        jest.restoreAllMocks(); // Restore original function implementations
    });
});
