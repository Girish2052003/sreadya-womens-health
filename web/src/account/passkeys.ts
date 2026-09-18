const PASSKEY_SESSION_HEADER = 'X-Sreadya-Passkey-Session';

type BeginResponse = {
  session_id: string;
  public_key: unknown;
};

type LoginResponse = {
  account_id: string;
};

export type PasskeyClientOptions = {
  fetchImpl?: typeof fetch;
  credentials?: CredentialsContainer;
  baseURL?: string;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid Sreadya ${label}.`);
  }
  return value as JsonRecord;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid Sreadya ${label}.`);
  return value;
}

function decodeBase64Url(value: unknown, label: string): Uint8Array<ArrayBuffer> {
  const encoded = nonEmptyString(value, label);
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(encoded)) throw new Error(`Invalid Sreadya ${label}.`);
  const standard = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), (part) => part.charCodeAt(0));
  } catch {
    throw new Error(`Invalid Sreadya ${label}.`);
  }
}

function encodeBase64Url(value: BufferSource): string {
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function publicKeyRecord(value: unknown): JsonRecord {
  const outer = record(value, 'passkey options');
  if ('publicKey' in outer) return record(outer.publicKey, 'passkey public-key options');
  return outer;
}

function decodeDescriptors(value: unknown, label: string): PublicKeyCredentialDescriptor[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`Invalid Sreadya ${label}.`);
  return value.map((entry) => {
    const descriptor = record(entry, label);
    return {
      ...descriptor,
      type: 'public-key',
      id: decodeBase64Url(descriptor.id, `${label} credential id`),
    } as PublicKeyCredentialDescriptor;
  });
}

function decodeCreationOptions(value: unknown): PublicKeyCredentialCreationOptions {
  const source = publicKeyRecord(value);
  const user = record(source.user, 'passkey user');
  const rp = record(source.rp, 'passkey relying party');
  if (!Array.isArray(source.pubKeyCredParams)) throw new Error('Invalid Sreadya passkey parameters.');

  const rpEntity: PublicKeyCredentialRpEntity = {
    name: nonEmptyString(rp.name, 'passkey relying-party name'),
    ...(rp.id === undefined ? {} : { id: nonEmptyString(rp.id, 'passkey relying-party id') }),
  };
  const userEntity: PublicKeyCredentialUserEntity = {
    id: decodeBase64Url(user.id, 'passkey user id'),
    name: nonEmptyString(user.name, 'passkey user name'),
    displayName: nonEmptyString(user.displayName, 'passkey user display name'),
  };

  return {
    ...source,
    challenge: decodeBase64Url(source.challenge, 'passkey challenge'),
    rp: rpEntity,
    user: userEntity,
    pubKeyCredParams: source.pubKeyCredParams as PublicKeyCredentialParameters[],
    excludeCredentials: decodeDescriptors(source.excludeCredentials, 'passkey excluded credentials'),
  } as PublicKeyCredentialCreationOptions;
}

function decodeRequestOptions(value: unknown): PublicKeyCredentialRequestOptions {
  const source = publicKeyRecord(value);
  return {
    ...source,
    challenge: decodeBase64Url(source.challenge, 'passkey challenge'),
    allowCredentials: decodeDescriptors(source.allowCredentials, 'passkey allowed credentials'),
  } as PublicKeyCredentialRequestOptions;
}

function credentialJSON(credential: PublicKeyCredential): unknown {
  const serializable = credential as PublicKeyCredential & { toJSON?: () => unknown };
  if (typeof serializable.toJSON === 'function') return serializable.toJSON();

  const response = credential.response as AuthenticatorResponse & {
    attestationObject?: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
    userHandle?: ArrayBuffer | null;
    getTransports?: () => string[];
  };
  const responseJSON: JsonRecord = {
    clientDataJSON: encodeBase64Url(response.clientDataJSON),
  };
  if (response.attestationObject) responseJSON.attestationObject = encodeBase64Url(response.attestationObject);
  if (response.authenticatorData) responseJSON.authenticatorData = encodeBase64Url(response.authenticatorData);
  if (response.signature) responseJSON.signature = encodeBase64Url(response.signature);
  if (response.userHandle) responseJSON.userHandle = encodeBase64Url(response.userHandle);
  if (typeof response.getTransports === 'function') responseJSON.transports = response.getTransports();

  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: responseJSON,
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment,
  };
}

function endpoint(baseURL: string | undefined, path: string): string {
  const base = (baseURL ?? '').replace(/\/$/, '');
  return `${base}${path}`;
}

function browserCredentials(explicit?: CredentialsContainer): CredentialsContainer {
  if (explicit) return explicit;
  if (typeof navigator === 'undefined' || !navigator.credentials) {
    throw new Error('Passkeys are unavailable in this browser.');
  }
  return navigator.credentials;
}

async function readJSON<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) throw new Error(`Sreadya ${label} was rejected.`);
  try {
    return await response.json() as T;
  } catch {
    throw new Error(`Invalid Sreadya ${label} response.`);
  }
}

export async function registerPasskey(accountID: string, options: PasskeyClientOptions = {}): Promise<void> {
  if (accountID.trim().length === 0) throw new Error('Sreadya account id is required.');
  const fetchImpl = options.fetchImpl ?? fetch;
  const credentials = browserCredentials(options.credentials);

  const begin = await readJSON<BeginResponse>(await fetchImpl(endpoint(options.baseURL, '/v1/auth/passkeys/register/begin'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountID }),
  }), 'passkey registration');
  const sessionID = nonEmptyString(begin.session_id, 'passkey registration session');
  const credential = await credentials.create({ publicKey: decodeCreationOptions(begin.public_key) });
  if (!(credential instanceof Object)) throw new Error('Passkey registration was cancelled.');

  const finish = await fetchImpl(endpoint(options.baseURL, '/v1/auth/passkeys/register/finish'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [PASSKEY_SESSION_HEADER]: sessionID,
    },
    body: JSON.stringify(credentialJSON(credential as PublicKeyCredential)),
  });
  if (!finish.ok) throw new Error('Sreadya passkey registration was rejected.');
}

export async function loginWithPasskey(options: PasskeyClientOptions = {}): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const credentials = browserCredentials(options.credentials);

  const begin = await readJSON<BeginResponse>(await fetchImpl(endpoint(options.baseURL, '/v1/auth/passkeys/login/begin'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }), 'passkey login');
  const sessionID = nonEmptyString(begin.session_id, 'passkey login session');
  const credential = await credentials.get({ publicKey: decodeRequestOptions(begin.public_key) });
  if (!(credential instanceof Object)) throw new Error('Passkey login was cancelled.');

  const result = await readJSON<LoginResponse>(await fetchImpl(endpoint(options.baseURL, '/v1/auth/passkeys/login/finish'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [PASSKEY_SESSION_HEADER]: sessionID,
    },
    body: JSON.stringify(credentialJSON(credential as PublicKeyCredential)),
  }), 'passkey login');
  return nonEmptyString(result.account_id, 'authenticated account');
}
