import { describe, expect, it } from 'vitest';

import { disabledWebPushClient } from './web-push-client';

describe('Web Push boundary before reviewed relay', () => {
  it('fails closed instead of pretending background delivery is configured', async () => {
    expect(disabledWebPushClient.configured).toBe(false);
    await expect(disabledWebPushClient.subscribe()).rejects.toThrow('web_push_relay_unconfigured');
  });
});
