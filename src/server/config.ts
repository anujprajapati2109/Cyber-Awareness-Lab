import path from "node:path";

const projectRoot = process.env.CYBER_LAB_PROJECT_ROOT ?? process.cwd();

export const config = {
  projectRoot,
  dataDir: process.env.CYBER_LAB_DATA_DIR ?? path.join(projectRoot, "data"),
  databasePath: process.env.CYBER_LAB_DATABASE_PATH ?? path.join(process.env.CYBER_LAB_DATA_DIR ?? path.join(projectRoot, "data"), "reconlens.sqlite"),
  host: "0.0.0.0",
  defaultPort: Number(process.env.CYBER_LAB_PORT ?? 4100),
  rendererOrigin: process.env.CYBER_LAB_RENDERER_ORIGIN ?? "http://localhost:5173"
};
