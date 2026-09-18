export type WebPushSubscriptionSummary = {
  endpoint: string;
};

export interface WebPushClient {
  readonly configured: boolean;
  subscribe(): Promise<WebPushSubscriptionSummary>;
}

class DisabledWebPushClient implements WebPushClient {
  readonly configured = false;

  async subscribe(): Promise<WebPushSubscriptionSummary> {
    throw new Error('web_push_relay_unconfigured');
  }
}

export const disabledWebPushClient: WebPushClient = new DisabledWebPushClient();
