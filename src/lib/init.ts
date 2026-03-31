// App initialization — runs once on server startup
let initialized = false;

export function initApp() {
  if (initialized || typeof window !== "undefined") return;
  initialized = true;

  // Start cron jobs
  import("./cron").then(({ initCron }) => {
    initCron();
  }).catch((err) => {
    console.error("[init] Failed to start cron:", err);
  });
}
