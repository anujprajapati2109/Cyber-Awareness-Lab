import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { DeploymentState, TunnelProvider } from "../../shared/types";

const installInstructions: Record<Exclude<TunnelProvider, "local">, string[]> = {
  cloudflare: [
    "Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    "Windows winget: winget install --id Cloudflare.cloudflared",
    "Verify in PowerShell: cloudflared --version"
  ],
  ngrok: [
    "Install ngrok: https://ngrok.com/download",
    "Windows winget: winget install --id Ngrok.Ngrok",
    "Authenticate once with your ngrok authtoken, then verify: ngrok version"
  ]
};

function commandFor(provider: TunnelProvider, port: number) {
  if (provider === "cloudflare") return { command: "cloudflared", args: ["tunnel", "--url", `http://localhost:${port}`] };
  if (provider === "ngrok") return { command: "ngrok", args: ["http", String(port), "--log=stdout"] };
  return null;
}

function extractPublicUrl(provider: TunnelProvider, text: string) {
  const urls = Array.from(text.matchAll(/https:\/\/[^\s"',)\\\]]+/g)).map((match) => match[0].replace(/[.,;:]+$/, ""));
  if (provider === "cloudflare") {
    return urls.find((url) => {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return host.endsWith(".trycloudflare.com") && host !== "api.trycloudflare.com" && host.split(".").length === 3;
      } catch {
        return false;
      }
    });
  }
  if (provider === "ngrok") {
    return urls.find((url) => {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return host.endsWith(".ngrok-free.app") || host.endsWith(".ngrok.io") || host.endsWith(".ngrok.app");
      } catch {
        return false;
      }
    });
  }
  return undefined;
}

export class TunnelManager {
  private process: ChildProcessWithoutNullStreams | null = null;
  private state: DeploymentState;
  private output = "";

  constructor(private readonly port: number) {
    this.state = {
      provider: "local",
      status: "stopped",
      localUrl: `http://localhost:${port}`,
      message: "Local-only mode"
    };
  }

  getState() {
    return this.state;
  }

  async start(provider: TunnelProvider): Promise<DeploymentState> {
    await this.stop();
    if (provider === "local") {
      this.state = {
        provider,
        status: "online",
        localUrl: `http://localhost:${this.port}`,
        publicUrl: `http://localhost:${this.port}`,
        message: "Local session is available on this PC.",
        startedAt: new Date().toISOString()
      };
      return this.state;
    }

    const spec = commandFor(provider, this.port);
    if (!spec) return this.state;
    const version = spawnSync(spec.command, ["--version"], { shell: true, encoding: "utf8" });
    if (version.error || version.status !== 0) {
      this.state = this.missing(provider, version.error ?? version.stderr ?? `${spec.command} returned ${version.status}`);
      return this.state;
    }

    this.state = {
      provider,
      status: "starting",
      localUrl: `http://localhost:${this.port}`,
      message: `Starting ${provider} tunnel...`,
      startedAt: new Date().toISOString()
    };

    return new Promise((resolve) => {
      let settled = false;
      const done = (state: DeploymentState) => {
        this.state = state;
        if (!settled) {
          settled = true;
          resolve(state);
        }
      };

      try {
        this.process = spawn(spec.command, spec.args, { shell: true });
      } catch (error) {
        done(this.missing(provider, error));
        return;
      }

      const parse = (chunk: Buffer) => {
        const text = chunk.toString();
        this.output = `${this.output}${text}`.slice(-6000);
        const url = extractPublicUrl(provider, this.output);
        if (url) {
          done({
            provider,
            status: "online",
            localUrl: `http://localhost:${this.port}`,
            publicUrl: url,
            message: `${provider} tunnel online`,
            startedAt: this.state.startedAt
          });
        }
      };

      this.process.stdout.on("data", parse);
      this.process.stderr.on("data", parse);
      this.process.on("error", (error) => done(this.missing(provider, error)));
      this.process.on("exit", (code) => {
        this.process = null;
        this.state = {
          ...this.state,
          status: "error",
          message: `${provider} tunnel stopped${typeof code === "number" ? ` with code ${code}` : ""}.${this.output ? ` Last output: ${this.output.slice(-600)}` : ""}`
        };
      });

      setTimeout(() => {
        if (!settled) {
          done({
            provider,
            status: "starting",
            localUrl: `http://localhost:${this.port}`,
            message: `${provider} is still starting. Waiting for the HTTPS URL...`,
            startedAt: this.state.startedAt
          });
        }
      }, 7000);
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.output = "";
    this.state = {
      provider: "local",
      status: "stopped",
      localUrl: `http://localhost:${this.port}`,
      message: "Tunnel stopped"
    };
  }

  private missing(provider: Exclude<TunnelProvider, "local">, error: unknown): DeploymentState {
    return {
      provider,
      status: "error",
      localUrl: `http://localhost:${this.port}`,
      message: `${provider} could not be started: ${error instanceof Error ? error.message : String(error)}`,
      installInstructions: installInstructions[provider]
    };
  }
}
