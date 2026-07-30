import { randomBytes, createHash } from "crypto";
import { db } from "./firebase-admin";

// Gateway keys live in Firestore, hashed. Raw key is shown once at creation.

export interface ApiKeyRecord {
  id: string;
  ownerUid: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
  revoked: boolean;
}

const COLLECTION = "apiKeys";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Generate a raw `sk-...` key. Not stored anywhere in raw form. */
function generateRawKey(): string {
  // 32 random bytes -> 64 hex chars, prefixed to look like an OpenAI key.
  return "sk-" + randomBytes(32).toString("hex");
}

/** Short display label, e.g. "sk-...a1b2" (last 4 chars). */
function displayPrefix(raw: string): string {
  return "sk-..." + raw.slice(-4);
}

export interface CreatedKey {
  record: ApiKeyRecord;
  rawKey: string;
}

export async function createApiKey(
  ownerUid: string,
  name: string
): Promise<CreatedKey> {
  const rawKey = generateRawKey();
  const keyHash = sha256(rawKey);
  const prefix = displayPrefix(rawKey);
  const createdAt = Date.now();

  const ref = await db().collection(COLLECTION).add({
    ownerUid,
    name: name || "Untitled key",
    keyHash,
    prefix,
    createdAt,
    lastUsedAt: null,
    revoked: false,
  });

  return {
    rawKey,
    record: {
      id: ref.id,
      ownerUid,
      name: name || "Untitled key",
      prefix,
      createdAt,
      lastUsedAt: null,
      revoked: false,
    },
  };
}

export async function listApiKeys(ownerUid: string): Promise<ApiKeyRecord[]> {
  const snap = await db()
    .collection(COLLECTION)
    .where("ownerUid", "==", ownerUid)
    .get();

  const keys = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ownerUid: data.ownerUid,
      name: data.name,
      prefix: data.prefix,
      createdAt: data.createdAt ?? 0,
      lastUsedAt: data.lastUsedAt ?? null,
      revoked: !!data.revoked,
    } satisfies ApiKeyRecord;
  });

  keys.sort((a, b) => b.createdAt - a.createdAt);
  return keys;
}

export async function revokeApiKey(
  ownerUid: string,
  keyId: string
): Promise<boolean> {
  const ref = db().collection(COLLECTION).doc(keyId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  if (doc.data()?.ownerUid !== ownerUid) return false;
  await ref.update({ revoked: true });
  return true;
}

/**
 * Validate a raw bearer key. Returns the owning record if valid and not
 * revoked, else null. Also updates lastUsedAt (best-effort).
 */
export async function verifyApiKey(rawKey: string): Promise<ApiKeyRecord | null> {
  if (!rawKey || !rawKey.startsWith("sk-")) return null;
  const keyHash = sha256(rawKey);

  const snap = await db()
    .collection(COLLECTION)
    .where("keyHash", "==", keyHash)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();
  if (data.revoked) return null;

  // Best-effort touch; don't block the request on it.
  doc.ref.update({ lastUsedAt: Date.now() }).catch(() => {});

  return {
    id: doc.id,
    ownerUid: data.ownerUid,
    name: data.name,
    prefix: data.prefix,
    createdAt: data.createdAt ?? 0,
    lastUsedAt: data.lastUsedAt ?? null,
    revoked: false,
  };
}

/** Extract a bearer token from an Authorization header. */
export function bearerFromHeader(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : null;
}
