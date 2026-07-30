import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/firebase-admin";

async function main() {
  const email = String(process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD ?? "");

  if (!email || !password) {
    console.error(
      "Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env — cannot seed admin."
    );
    process.exit(1);
  }

  const users = db().collection("users");
  const existing = await users.where("email", "==", email).limit(1).get();

  const passwordHash = await bcrypt.hash(password, 12);

  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.update({ passwordHash, updatedAt: Date.now() });
    console.log(`Updated existing admin user: ${email} (uid: ${doc.id})`);
    return;
  }

  const ref = await users.add({
    email,
    passwordHash,
    createdAt: Date.now(),
  });
  console.log(`Created admin user: ${email} (uid: ${ref.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
