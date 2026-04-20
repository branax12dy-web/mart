const databaseUrl =
  process.env.NEON_DATABASE_URL ||
  process.env.APP_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "NEON_DATABASE_URL, APP_DATABASE_URL, or DATABASE_URL must be set. Did you forget to configure a database?",
  );
}

export { databaseUrl };