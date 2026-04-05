process.env.NODE_ENV ??= "development";
process.env.PORT ??= "5000";

import("../server/index.ts").catch((error) => {
  console.error(error);
  process.exit(1);
});
