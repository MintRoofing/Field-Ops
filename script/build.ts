import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    external: [
      "@google-cloud/storage",
      "connect-pg-simple",
      "express",
      "express-session",
      "memoizee",
      "openid-client",
      "passport",
      "pg",
    ],
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
