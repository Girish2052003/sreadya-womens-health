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
    throw new Error(
      'A reviewed Web Push relay is not configured. Sreadya will not claim closed-app delivery until that security/deployment boundary is approved.',
    );
  }
}

export const disabledWebPushClient: WebPushClient = new DisabledWebPushClient();
