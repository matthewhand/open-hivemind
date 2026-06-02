/**
 * Tests for MattermostClient.setCustomStatus() — the REST call that backs
 * MattermostService.setModelActivity(). Verifies the correct endpoint/payload,
 * the 100-char truncation, the not-connected guard, and best-effort error
 * swallowing.
 */

import MattermostClient from './mattermostClient';

const getApi = (client: MattermostClient) => (client as unknown as { api: { put: jest.Mock } }).api;

const buildClient = (connected = true): MattermostClient => {
  const client = new MattermostClient({ serverUrl: 'https://mm.example.com', token: 'tok' });
  (client as unknown as { connected: boolean }).connected = connected;
  getApi(client).put = jest.fn().mockResolvedValue({});
  return client;
};

describe('MattermostClient.setCustomStatus', () => {
  it('PUTs to /users/me/status/custom with text and default emoji', async () => {
    const client = buildClient();
    await client.setCustomStatus('Model: gpt-4o');

    expect(getApi(client).put).toHaveBeenCalledTimes(1);
    expect(getApi(client).put).toHaveBeenCalledWith('/users/me/status/custom', {
      emoji: 'robot_face',
      text: 'Model: gpt-4o',
    });
  });

  it('respects a custom emoji', async () => {
    const client = buildClient();
    await client.setCustomStatus('busy', 'gear');
    expect(getApi(client).put).toHaveBeenCalledWith('/users/me/status/custom', {
      emoji: 'gear',
      text: 'busy',
    });
  });

  it('truncates status text to 100 characters', async () => {
    const client = buildClient();
    const long = 'x'.repeat(150);
    await client.setCustomStatus(long);
    const payload = getApi(client).put.mock.calls[0][1];
    expect(payload.text).toHaveLength(100);
  });

  it('no-ops when not connected', async () => {
    const client = buildClient(false);
    await client.setCustomStatus('Model: gpt-4o');
    expect(getApi(client).put).not.toHaveBeenCalled();
  });

  it('swallows API errors (best-effort)', async () => {
    const client = buildClient();
    getApi(client).put = jest.fn().mockRejectedValue(new Error('missing scope'));
    await expect(client.setCustomStatus('Model: gpt-4o')).resolves.toBeUndefined();
  });
});
