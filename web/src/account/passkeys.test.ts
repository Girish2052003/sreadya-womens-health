import { describe, expect, it } from 'vitest';

import { loginWithPasskey, registerPasskey } from './passkeys';

function bytes(value: BufferSource): number[] {
  if (value instanceof ArrayBuffer) return Array.from(new Uint8Array(value));
  return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
}

function jsonCredential(id: string): PublicKeyCredential {
  return {
    id,
    type: 'public-key',
    rawId: new Uint8Array([9, 9, 9]).buffer,
    authenticatorAttachment: null,
    response: {} as AuthenticatorResponse,
    getClientExtensionResults: () => ({}),
    isConditionalMediationAvailable: async () => false,
    toJSON: () => ({ id, type: 'public-key', response: { clientDataJSON: 'opaque' } }),
  } as unknown as PublicKeyCredential;
}

describe('Task 23 browser passkey client', () => {
  it('registers with decoded WebAuthn binary options and an opaque header session', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let creation: CredentialCreationOptions | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === '/v1/auth/passkeys/register/begin') {
        return new Response(JSON.stringify({
          session_id: 'registration-session',
          public_key: {
            challenge: 'AQID',
            rp: { name: 'Sreva', id: 'example.test' },
            user: { id: 'BAUG', name: 'wife@example.test', displayName: 'Wife' },
            pubKeyCredParams: [{ type: 'public-key', alg: -8 }],
            excludeCredentials: [{ type: 'public-key', id: 'BwgJ' }],
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/v1/auth/passkeys/register/finish') {
        return new Response(JSON.stringify({ status: 'verified' }), { status: 200 });
      }
      throw new Error(`unexpected URL ${url}`);
    };
    const credentials = {
      create: async (options?: CredentialCreationOptions) => {
        creation = options;
        return jsonCredential('registration-credential');
      },
      get: async () => null,
      preventSilentAccess: async () => undefined,
      store: async () => undefined,
    } as CredentialsContainer;

    await registerPasskey('acct-a', { fetchImpl, credentials });

    expect(calls).toHaveLength(2);
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.body).toBe(JSON.stringify({ account_id: 'acct-a' }));
    expect(creation?.publicKey).toBeDefined();
    expect(bytes(creation!.publicKey!.challenge)).toEqual([1, 2, 3]);
    expect(bytes(creation!.publicKey!.user.id)).toEqual([4, 5, 6]);
    expect(bytes(creation!.publicKey!.excludeCredentials![0].id)).toEqual([7, 8, 9]);
    const finishHeaders = new Headers(calls[1].init?.headers);
    expect(finishHeaders.get('X-Sreva-Passkey-Session')).toBe('registration-session');
    expect(calls[1].url).not.toContain('registration-session');
    expect(String(calls[1].init?.body)).toContain('registration-credential');
  });

  it('logs in with decoded request options and returns the authenticated account', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let requestOptions: CredentialRequestOptions | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === '/v1/auth/passkeys/login/begin') {
        return new Response(JSON.stringify({
          session_id: 'login-session',
          public_key: {
            challenge: 'CgsM',
            rpId: 'example.test',
            allowCredentials: [{ type: 'public-key', id: 'DQ4P' }],
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/v1/auth/passkeys/login/finish') {
        return new Response(JSON.stringify({ account_id: 'acct-a' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`unexpected URL ${url}`);
    };
    const credentials = {
      create: async () => null,
      get: async (options?: CredentialRequestOptions) => {
        requestOptions = options;
        return jsonCredential('login-credential');
      },
      preventSilentAccess: async () => undefined,
      store: async () => undefined,
    } as CredentialsContainer;

    const accountID = await loginWithPasskey({ fetchImpl, credentials });

    expect(accountID).toBe('acct-a');
    expect(requestOptions?.publicKey).toBeDefined();
    expect(bytes(requestOptions!.publicKey!.challenge)).toEqual([10, 11, 12]);
    expect(bytes(requestOptions!.publicKey!.allowCredentials![0].id)).toEqual([13, 14, 15]);
    const finishHeaders = new Headers(calls[1].init?.headers);
    expect(finishHeaders.get('X-Sreva-Passkey-Session')).toBe('login-session');
    expect(calls[1].url).not.toContain('login-session');
  });

  it('fails closed when the browser cancels the passkey ceremony', async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
      session_id: 'registration-session',
      public_key: {
        challenge: 'AQID',
        rp: { name: 'Sreva' },
        user: { id: 'BAUG', name: 'wife@example.test', displayName: 'Wife' },
        pubKeyCredParams: [{ type: 'public-key', alg: -8 }],
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const credentials = {
      create: async () => null,
      get: async () => null,
      preventSilentAccess: async () => undefined,
      store: async () => undefined,
    } as CredentialsContainer;

    await expect(registerPasskey('acct-a', { fetchImpl, credentials })).rejects.toThrow(/cancelled/i);
  });
});
