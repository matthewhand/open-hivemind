import Debug from 'debug';
import { FlowiseClient } from 'flowise-sdk';
import flowiseConfig from '@integrations/flowise/flowiseConfig';
import { getCircuitBreaker } from '@common/CircuitBreaker';

const debug = Debug('app:flowiseSdkClient');

const circuitBreaker = getCircuitBreaker({
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
      const completion = await client.createPrediction({
        chatflowId,
        question: prompt,
        overrideConfig: {
          credentials: {
            DefaultKey: apiKey,
          },
        },
        streaming: false,
      });

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
