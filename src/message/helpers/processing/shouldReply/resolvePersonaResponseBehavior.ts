import Debug from 'debug';
import { PersonaManager, type PersonaResponseBehavior } from '../../../../managers/PersonaManager';

const debug = Debug('app:shouldReplyToMessage');

/**
 * Resolve the persona's responseBehavior from botConfig.persona (an ID string).
 * Returns undefined when no persona is configured or the persona has no overrides.
 */
export async function resolvePersonaResponseBehavior(
  botConfig?: Record<string, unknown>
): Promise<PersonaResponseBehavior | undefined> {
  const personaId = botConfig?.persona;
  if (typeof personaId !== 'string' || !personaId) {
    return undefined;
  }
  try {
    const manager = await PersonaManager.getInstance();
    const persona = manager.getPersona(personaId);
    return persona?.responseBehavior;
  } catch (err) {
    debug('Error resolving persona response behavior:', err);
    return undefined;
  }
}
