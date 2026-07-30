import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT env var is missing. Paste the stringified service-account JSON into .env"
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON. Make sure it is the entire service-account JSON on one line."
    );
  }
}

export function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length) {
    app = existing[0];
    return app;
  }
  const sa = getServiceAccount();
  app = initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: (sa.private_key as string)?.replace(/\\n/g, "\n"),
    }),
  });
  return app;
}

export function db(): Firestore {
  // Admin SDK talks to the "(default)" database unless a specific database id
  // is provided. If you named your Firestore database something else, set
  // FIREBASE_DATABASE_ID in .env to that name.
  const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
  return databaseId
    ? getFirestore(getAdminApp(), databaseId)
    : getFirestore(getAdminApp());
}
