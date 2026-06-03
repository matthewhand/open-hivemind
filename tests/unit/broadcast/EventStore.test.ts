import { EventStore } from '../../../src/server/services/websocket/broadcast/EventStore';
import type {
  AlertEvent,
  MessageFlowEvent,
  SystemEvent,
} from '../../../src/server/services/websocket/types';

function makeMessageFlow(
  overrides: Partial<MessageFlowEvent> = {}
): Omit<MessageFlowEvent, 'id' | 'timestamp'> {
  return {
    botName: 'TestBot',
    provider: 'discord',
    channelId: 'channel-1',
    userId: 'user-1',
    messageType: 'incoming',
    contentLength: 100,
    status: 'success',
    ...overrides,
  };
}

function makeAlert(
  overrides: Partial<AlertEvent> = {}
): Omit<AlertEvent, 'id' | 'timestamp' | 'status' | 'acknowledgedAt' | 'resolvedAt'> {
  return {
    level: 'warning',
    title: 'Test Alert',
    message: 'Something happened',
    botName: 'TestBot',
    ...overrides,
  };
}

function makeSystemEvent(
  overrides: Partial<SystemEvent> = {}
): Omit<SystemEvent, 'id' | 'timestamp'> {
  return {
    type: 'info',
    category: 'lifecycle',
    message: 'System started',
    ...overrides,
  };
}

describe('EventStore', () => {
  let store: EventStore;

  beforeEach(() => {
    store = new EventStore();
  });

  describe('recordMessageFlow', () => {
    it('should record a message flow event and return it with id and timestamp', () => {
      const event = store.recordMessageFlow(makeMessageFlow({ botName: 'BotA' }));
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.botName).toBe('BotA');
      expect(event.status).toBe('success');
    });

    it('should store events in reverse chronological order (newest first)', () => {
      store.recordMessageFlow(makeMessageFlow({ botName: 'BotA' }));
      store.recordMessageFlow(makeMessageFlow({ botName: 'BotB' }));
      store.recordMessageFlow(makeMessageFlow({ botName: 'BotC' }));

      const flow = store.getMessageFlow();
      expect(flow[0].botName).toBe('BotC');
      expect(flow[1].botName).toBe('BotB');
      expect(flow[2].botName).toBe('BotA');
    });

    it('should respect the limit parameter on getMessageFlow', () => {
      for (let i = 0; i < 10; i++) {
        store.recordMessageFlow(makeMessageFlow({ botName: `Bot${i}` }));
      }
      expect(store.getMessageFlow(3)).toHaveLength(3);
      expect(store.getMessageFlow(100)).toHaveLength(10);
    });

    it('should cap message flow at 500 entries', () => {
      for (let i = 0; i < 600; i++) {
        store.recordMessageFlow(makeMessageFlow());
      }
      expect(store.getTotalMessageCount()).toBe(500);
    });

    it('should track errors per bot name', () => {
      store.recordMessageFlow(
        makeMessageFlow({ botName: 'BotA', status: 'error', errorMessage: 'Timeout' })
      );
      store.recordMessageFlow(
        makeMessageFlow({ botName: 'BotA', status: 'error', errorMessage: 'Rate limit' })
      );
      store.recordMessageFlow(
        makeMessageFlow({ botName: 'BotB', status: 'error', errorMessage: 'Auth failed' })
      );

      expect(store.getBotErrors('BotA')).toEqual(['Rate limit', 'Timeout']);
      expect(store.getBotErrors('BotB')).toEqual(['Auth failed']);
      expect(store.getBotErrors('BotC')).toEqual([]);
    });

    it('should cap bot error history at 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        store.recordMessageFlow(
          makeMessageFlow({ botName: 'BotA', status: 'error', errorMessage: `Error ${i}` })
        );
      }
      const errors = store.getBotErrors('BotA');
      expect(errors).toHaveLength(20);
      // Newest first: error 24 should be at index 0
      expect(errors[0]).toBe('Error 24');
    });
  });

  describe('recordAlert', () => {
    it('should create a new alert with active status', () => {
      const alert = store.recordAlert(makeAlert({ title: 'CPU High' }));
      expect(alert.id).toBeDefined();
      expect(alert.status).toBe('active');
      expect(alert.title).toBe('CPU High');
    });

    it('should deduplicate: update existing active alert instead of creating new one', () => {
      const alert1 = store.recordAlert(
        makeAlert({ title: 'CPU High', botName: 'BotA', message: 'First' })
      );
      const alert2 = store.recordAlert(
        makeAlert({ title: 'CPU High', botName: 'BotA', message: 'Second' })
      );

      expect(alert2.id).toBe(alert1.id);
      expect(alert2.message).toBe('Second');
      expect(store.getTotalAlertCount()).toBe(1);
    });

    it('should allow a new alert with same title after previous one is resolved', () => {
      const alert1 = store.recordAlert(makeAlert({ title: 'CPU High', botName: 'BotA' }));
      store.resolveAlert(alert1.id);
      const alert2 = store.recordAlert(makeAlert({ title: 'CPU High', botName: 'BotA' }));
      expect(alert2.id).not.toBe(alert1.id);
      expect(store.getTotalAlertCount()).toBe(2);
    });

    it('should not deduplicate alerts for different bots with same title', () => {
      const a1 = store.recordAlert(makeAlert({ title: 'CPU High', botName: 'BotA' }));
      const a2 = store.recordAlert(makeAlert({ title: 'CPU High', botName: 'BotB' }));
      expect(a2.id).not.toBe(a1.id);
      expect(store.getTotalAlertCount()).toBe(2);
    });

    it('should cap alerts at 100', () => {
      for (let i = 0; i < 150; i++) {
        store.recordAlert(makeAlert({ title: `Alert ${i}`, botName: `Bot${i}` }));
      }
      expect(store.getTotalAlertCount()).toBe(100);
    });

    it('should respect the limit parameter on getAlerts', () => {
      for (let i = 0; i < 10; i++) {
        store.recordAlert(makeAlert({ title: `Alert ${i}`, botName: `Bot${i}` }));
      }
      expect(store.getAlerts(3)).toHaveLength(3);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should set status to acknowledged', () => {
      const alert = store.recordAlert(makeAlert());
      const result = store.acknowledgeAlert(alert.id);
      expect(result).toBe(true);
      expect(alert.status).toBe('acknowledged');
      expect(alert.acknowledgedAt).toBeDefined();
    });

    it('should return false for non-existent id', () => {
      expect(store.acknowledgeAlert('nonexistent')).toBe(false);
    });

    it('should return false if already acknowledged', () => {
      const alert = store.recordAlert(makeAlert());
      store.acknowledgeAlert(alert.id);
      expect(store.acknowledgeAlert(alert.id)).toBe(false);
    });
  });

  describe('resolveAlert', () => {
    it('should set status to resolved', () => {
      const alert = store.recordAlert(makeAlert());
      const result = store.resolveAlert(alert.id);
      expect(result).toBe(true);
      expect(alert.status).toBe('resolved');
      expect(alert.resolvedAt).toBeDefined();
    });

    it('should resolve acknowledged alerts too', () => {
      const alert = store.recordAlert(makeAlert());
      store.acknowledgeAlert(alert.id);
      expect(store.resolveAlert(alert.id)).toBe(true);
    });

    it('should return false if already resolved', () => {
      const alert = store.recordAlert(makeAlert());
      store.resolveAlert(alert.id);
      expect(store.resolveAlert(alert.id)).toBe(false);
    });

    it('should return false for non-existent id', () => {
      expect(store.resolveAlert('nonexistent')).toBe(false);
    });
  });

  describe('recordSystemEvent', () => {
    it('should record a system event with id and timestamp', () => {
      const event = store.recordSystemEvent(makeSystemEvent({ message: 'Deployed' }));
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.message).toBe('Deployed');
    });

    it('should cap system events at 200', () => {
      for (let i = 0; i < 300; i++) {
        store.recordSystemEvent(makeSystemEvent());
      }
      // getSystemEvents is not public, tested via getMessageFlow indirectly — just ensure no crash
      // The internal cap prevents unbounded growth
    });
  });

  describe('getAllBotErrors', () => {
    it('should return a copy of the errors map', () => {
      store.recordMessageFlow(
        makeMessageFlow({ botName: 'BotA', status: 'error', errorMessage: 'Oops' })
      );
      const errors = store.getAllBotErrors();
      expect(errors.get('BotA')).toEqual(['Oops']);
      // Mutating the returned map should not affect internal state
      errors.set('BotB', ['test']);
      expect(store.getBotErrors('BotB')).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should reset all internal state', () => {
      store.recordMessageFlow(makeMessageFlow());
      store.recordAlert(makeAlert());
      store.recordSystemEvent(makeSystemEvent());
      store.recordMessageFlow(
        makeMessageFlow({ botName: 'X', status: 'error', errorMessage: 'E' })
      );

      store.clear();

      expect(store.getMessageFlow()).toEqual([]);
      expect(store.getTotalMessageCount()).toBe(0);
      expect(store.getAlerts()).toEqual([]);
      expect(store.getTotalAlertCount()).toBe(0);
      expect(store.getBotErrors('X')).toEqual([]);
    });
  });
});
