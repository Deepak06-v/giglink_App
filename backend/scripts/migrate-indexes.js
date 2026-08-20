import "dotenv/config";
import mongoose from "mongoose";

const PHONE_INDEX_NAME = "authProviders.providerId_phone_unique";
const GOOGLE_INDEX_NAME = "authProviders.providerId_google_unique";

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const db = mongoose.connection.db;
  const users = db.collection("users");

  const indexes = await users.indexes();

  console.log("=== Existing users indexes ===");
  for (const index of indexes) {
    console.log({
      name: index.name,
      key: index.key,
      unique: !!index.unique,
      sparse: !!index.sparse,
      partialFilter: index.partialFilterExpression || null,
    });
  }

  const oldEmailIndex = indexes.find(
    (i) =>
      i.name === "email_1" &&
      i.key &&
      i.key.email === 1 &&
      i.unique &&
      !i.sparse
  );

  if (oldEmailIndex) {
    console.log("Dropping old non-sparse unique email index: email_1");
    await users.dropIndex("email_1");
  } else {
    console.log("No old non-sparse unique email index found; nothing to drop.");
  }

  const sparseEmailIndex = indexes.find(
    (i) => i.name === "email_1" && i.unique && i.sparse
  );

  if (!sparseEmailIndex) {
    console.log("Creating sparse unique email index: email_1");
    await users.createIndex(
      { email: 1 },
      { name: "email_1", unique: true, sparse: true, background: true }
    );
  } else {
    console.log("Sparse unique email index already present; skipping.");
  }

  const phoneIndex = indexes.find((i) => i.name === PHONE_INDEX_NAME);

  if (!phoneIndex) {
    console.log("Creating phone-provider partial unique index");
    await users.createIndex(
      { "authProviders.providerId": 1 },
      {
        name: PHONE_INDEX_NAME,
        unique: true,
        partialFilterExpression: { "authProviders.provider": "phone" },
        background: true,
      }
    );
  } else {
    console.log("Phone-provider partial unique index already present; skipping.");
  }

  const googleIndex = indexes.find((i) => i.name === GOOGLE_INDEX_NAME);

  if (!googleIndex) {
    console.log("Creating google-provider partial unique index");
    await users.createIndex(
      { "authProviders.providerId": 1 },
      {
        name: GOOGLE_INDEX_NAME,
        unique: true,
        partialFilterExpression: { "authProviders.provider": "google" },
        background: true,
      }
    );
  } else {
    console.log("Google-provider partial unique index already present; skipping.");
  }

  console.log("=== Final users indexes ===");
  const finalIndexes = await users.indexes();
  for (const index of finalIndexes) {
    console.log({
      name: index.name,
      key: index.key,
      unique: !!index.unique,
      sparse: !!index.sparse,
      partialFilter: index.partialFilterExpression || null,
    });
  }

  await mongoose.connection.close();
  console.log("Index migration complete.");
};

main().catch((error) => {
  console.error("Index migration failed:", error.message);
  process.exit(1);
});