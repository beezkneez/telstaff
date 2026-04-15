// App initialization — runs once on server startup
let initialized = false;

export function initApp() {
  if (initialized || typeof window !== "undefined") return;
  initialized = true;

  // Ensure first user is admin
  import("./prisma").then(({ prisma }) => {
    prisma.user.findFirst({ orderBy: { createdAt: "asc" } }).then((firstUser) => {
      if (firstUser && !firstUser.isAdmin) {
        prisma.user.update({
          where: { id: firstUser.id },
          data: { isAdmin: true },
        }).then(() => {
          console.log("[init] Set first user as admin:", firstUser.email);
        }).catch(console.error);
      }
    }).catch(console.error);

    // Ensure judbeasley@gmail.com is always admin
    prisma.user.findUnique({ where: { email: "judbeasley@gmail.com" } }).then((adminUser) => {
      if (adminUser && !adminUser.isAdmin) {
        prisma.user.update({
          where: { id: adminUser.id },
          data: { isAdmin: true },
        }).then(() => {
          console.log("[init] Set judbeasley@gmail.com as admin");
        }).catch(console.error);
      }
    }).catch(console.error);
  });

  // Start cron jobs
  import("./cron").then(({ initCron }) => {
    initCron();
  }).catch((err) => {
    console.error("[init] Failed to start cron:", err);
  });
}
