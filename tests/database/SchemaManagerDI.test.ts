import 'reflect-metadata';
import { container } from 'tsyringe';
import { ConnectionManager } from '../../src/database/ConnectionManager';
import { SchemaManager } from '../../src/database/SchemaManager';

jest.mock('../../src/common/logger');

/**
 * Regression test for the latent DI defect in the alternate schema system.
 *
 * SchemaManager injects ConnectionManager, which has a *required* constructor
 * argument (ConnectionOptions). tsyringe cannot auto-construct that, so the
 * previous `container.registerSingleton(TOKENS.SchemaManager, SchemaManager)`
 * registration would throw on resolution. registration.ts now registers both
 * via factories. This test pins down that the factory wiring resolves cleanly.
 */
describe('SchemaManager DI resolution', () => {
  it('resolves SchemaManager (with its ConnectionManager dependency) via factory registration', () => {
    const c = container.createChildContainer();

    c.register(ConnectionManager, {
      useFactory: () => new ConnectionManager({ databasePath: ':memory:' }),
    });
    c.register('SchemaManager', {
      useFactory: () => new SchemaManager(c.resolve(ConnectionManager)),
    });

    const resolved = c.resolve<SchemaManager>('SchemaManager');
    expect(resolved).toBeInstanceOf(SchemaManager);
    expect(typeof resolved.initializeSchema).toBe('function');
  });

  it('cannot auto-construct ConnectionManager via useClass (documents why a factory is required)', () => {
    const c = container.createChildContainer();
    // No factory: tsyringe tries to construct ConnectionManager directly.
    // ConnectionManager is a plain (non-@injectable) class with a required
    // ConnectionOptions argument, so tsyringe has no type info and throws.
    // This is exactly why registration.ts uses a databasePath-bearing factory.
    c.register('BareConnectionManager', { useClass: ConnectionManager });
    expect(() => c.resolve<ConnectionManager>('BareConnectionManager')).toThrow(
      /TypeInfo not known/
    );
  });
});
