export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { hasMySqlConfig, initializeDatabase } = await import("./lib/mysql");
  if (!hasMySqlConfig()) return;

  try {
    await initializeDatabase();
    console.info("[startup] MySQL database initialized");
  } catch (error) {
    console.error("[startup] MySQL database initialization failed:", error);
    throw error;
  }
}
