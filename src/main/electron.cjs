const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, shell } = require("electron");

let serverHandle;
let logFile;

const log = (message, error) => {
  const line = `[${new Date().toISOString()}] ${message}${error ? `\n${error.stack || error.message || String(error)}` : ""}\n`;
  console.log(line);
  if (logFile) {
    try {
      fs.appendFileSync(logFile, line);
    } catch {
      // Logging must never stop the desktop window from opening.
    }
  }
};

const startBundledServer = () => {
  if (!app.isPackaged) return;
  process.env.CYBER_LAB_DATA_DIR = path.join(app.getPath("userData"), "data");
  process.env.CYBER_LAB_STATIC_DIR = path.join(process.resourcesPath, "app.asar.unpacked", "dist", "renderer");
  const runtimePath = path.join(process.resourcesPath, "app.asar.unpacked", "dist", "server", "runtime.cjs");
  log(`Loading bundled server from ${runtimePath}`);
  const runtime = require(runtimePath);
  serverHandle = runtime.startServer(4100);
  return serverHandle.ready;
};

const createWindow = async (startupError) => {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: "#020403",
    title: "ReconLens",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    log(`Renderer failed to load ${url}: ${code} ${description}`);
  });

  if (app.isPackaged) {
    if (startupError) {
      await win.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(`
          <body style="background:#020403;color:#d7fbea;font-family:Segoe UI,Arial;padding:32px">
            <h1>ReconLens could not start</h1>
            <p>The desktop shell opened, but the local server failed.</p>
            <pre style="white-space:pre-wrap;background:#071214;border:1px solid #25f39b55;padding:16px;border-radius:8px">${String(startupError.stack || startupError.message || startupError)}</pre>
            <p>Startup log: ${logFile}</p>
          </body>
        `)}`
      );
      return;
    }
    await win.loadURL("http://localhost:4100");
  } else {
    await win.loadURL(process.env.CYBER_LAB_RENDERER_ORIGIN || "http://localhost:5173");
  }
};

app.whenReady().then(async () => {
  logFile = path.join(app.getPath("userData"), "startup.log");
  log(`App ready. packaged=${app.isPackaged} resources=${process.resourcesPath}`);
  let startupError = null;
  try {
    const ready = startBundledServer();
    if (ready) await ready;
  } catch (error) {
    startupError = error;
    log("Failed to start bundled server", error);
  }
  await createWindow(startupError);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  serverHandle?.server?.close();
});
