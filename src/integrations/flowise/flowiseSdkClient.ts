import Debug from 'debug';
import { FlowiseClient } from 'flowise-sdk';
import flowiseConfig from '@integrations/flowise/flowiseConfig';
import { globalRecoveryManager } from '../../utils/errorRecovery';
import { withTimeout } from '@common/withTimeout';

const debug = Debug('app:flowiseSdkClient');

/** Default timeout for Flowise SDK calls (30 seconds). */
const DEFAULT_FLOWISE_TIMEOUT_MS = 30_000;

const circuitBreaker = globalRecoveryManager.getCircuitBreaker('flowise-sdk', {
  name: 'flowise',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 3,
});

export async function getFlowiseSdkResponse(prompt: string, chatflowId: string): Promise<string> {
  const client = new FlowiseClient({ baseUrl: flowiseConfig.get('FLOWISE_API_ENDPOINT') });
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY');

  try {
    return await circuitBreaker.execute(async () => {
      debug('Sending request to Flowise SDK API with prompt:', prompt);
      const completion = await withTimeout(
        () => client.createPrediction({
          chatflowId,
          question: prompt,
          overrideConfig: {
            credentials: {
              DefaultKey: apiKey,
            },
          },
          streaming: false,
        }),
        DEFAULT_FLOWISE_TIMEOUT_MS,
        'Flowise SDK prediction',
      );

      if (completion.text) {
        debug('Received response:', completion.text);
        return completion.text;
      }

      debug('Flowise SDK unavailable, returning empty string');
      return '';
    });
  } catch (error: any) {
    debug('Error using Flowise SDK:', error);
    debug('Flowise SDK unavailable, returning empty string');
    return '';
  }
}
