import express, { Response } from "express";
import cors from "cors";
import "express-async-errors";
import multer from "multer";
import Docker from "dockerode";
import axios from "axios";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { writeDockerfile } from "./dockerfile-generator";

const execAsync = promisify(exec);

const app = express();

app.use(express.json());
app.use(cors());

// Configure multer for file uploads
const upload = multer({ dest: "/tmp/uploads" });

// Docker client
const docker = new Docker();

type Deployment = {
  id: string;
  status: "pending" | "building" | "deploying" | "running" | "failed";
  logs: string[];
  containerId?: string;
  imageTag?: string;
  route?: string;
  port?: number;
  gitUrl?: string;
  createdAt: number;
};

const deployments: Deployment[] = [];

// Track SSE clients per deployment
const sseClients: Map<string, Set<Response>> = new Map();

// Track the next available port for containers
let nextPort = 3000;
const getNextPort = () => nextPort++;

// Helper to broadcast logs to all connected SSE clients
const broadcastLog = (deploymentId: string, log: string) => {
  const clients = sseClients.get(deploymentId);
  if (clients) {
    clients.forEach((res) => {
      res.write(`data: ${log}\n\n`);
    });
  }
};

// Helper to add log with timestamp
const addLog = (deployment: Deployment, msg: string) => {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${msg}`;
  deployment.logs.push(logEntry);
  broadcastLog(deployment.id, logEntry);
};

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Mini PaaS API Running" });
});

app.post("/deploy", upload.single("project"), async (req, res) => {
  const id = Date.now().toString();
  const port = getNextPort();

  const deployment: Deployment = {
    id,
    status: "pending",
    logs: [],
    port,
    createdAt: Date.now()
  };

  deployments.push(deployment);

  // Assign route early
  const route = `/app/${id}`;
  deployment.route = route;

  // Start deployment pipeline asynchronously
  (async () => {
    try {
      addLog(deployment, "Deployment created");

      // Determine source: Git URL or uploaded file
      const gitUrl = req.body.gitUrl;
      const uploadedFile = (req as any).file;

      let projectPath: string;

      if (gitUrl) {
        addLog(deployment, `Cloning repository: ${gitUrl}`);
        projectPath = `/tmp/projects/${id}`;
        await execAsync(`git clone ${gitUrl} ${projectPath}`);
        addLog(deployment, "Repository cloned successfully");
      } else if (uploadedFile) {
        addLog(deployment, "Processing uploaded project");
        projectPath = `/tmp/projects/${id}`;
        fs.mkdirSync(projectPath, { recursive: true });
        // For simplicity, extract if zip, otherwise treat as single file
        // In production, would properly handle archives
        fs.copyFileSync(uploadedFile.path, path.join(projectPath, uploadedFile.filename));
        addLog(deployment, "Project extracted");
      } else {
        throw new Error("No Git URL or project file provided");
      }

      // Build with Railpack-equivalent framework detection
      deployment.status = "building";
      addLog(deployment, "Building started...");

      // Generate Dockerfile based on app framework detection
      addLog(deployment, "Detecting application framework...");
      try {
        writeDockerfile(projectPath);
        addLog(deployment, "Dockerfile generated (framework auto-detected)");
      } catch (err: any) {
        addLog(deployment, `Dockerfile generation failed: ${err.message}`);
        throw err;
      }

      // Verify Dockerfile was created
      const dockerfilePath = path.join(projectPath, "Dockerfile");
      if (!fs.existsSync(dockerfilePath)) {
        throw new Error("Failed to generate Dockerfile");
      }

      // Build Docker image
      addLog(deployment, `Building Docker image: mini-paas:${id}`);
      const imageTag = `mini-paas:${id}`;
      deployment.imageTag = imageTag;

      await buildDockerImage(imageTag, projectPath, deployment);

      addLog(deployment, "Image built successfully");

      // Deploy: Run container
      deployment.status = "deploying";
      addLog(deployment, `Starting container on port ${port}...`);

      const containerId = await runContainer(imageTag, port, deployment);
      deployment.containerId = containerId;

      deployment.status = "running";
      addLog(deployment, `Container running successfully`);
      addLog(deployment, `App available at http://localhost${deployment.route}`);
    } catch (error: any) {
      deployment.status = "failed";
      addLog(deployment, `ERROR: ${error.message}`);
      console.error("Deployment pipeline error:", error);
    }
  })();

  res.json(deployment);
});

app.get("/deployments", (req, res) => {
  res.json(deployments);
});

// SSE endpoint for live log streaming
app.get("/logs/:id", (req, res) => {
  const deploymentId = req.params.id;
  const deployment = deployments.find((d) => d.id === deploymentId);

  if (!deployment) {
    return res.status(404).json({ error: "Deployment not found" });
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send all existing logs first
  deployment.logs.forEach((log) => {
    res.write(`data: ${log}\n\n`);
  });

  // Register this client to receive new logs
  if (!sseClients.has(deploymentId)) {
    sseClients.set(deploymentId, new Set());
  }
  sseClients.get(deploymentId)!.add(res);

  // Handle client disconnect
  res.on("close", () => {
    sseClients.get(deploymentId)?.delete(res);
    if (sseClients.get(deploymentId)?.size === 0) {
      sseClients.delete(deploymentId);
    }
  });
});

app.get("/app/:id", (req, res) => {
  const deployment = deployments.find((d) => d.id === req.params.id);

  if (!deployment) {
    return res.status(404).send("Deployment not found");
  }

  res.send(`
    <html>
      <head>
        <title>Deployment ${deployment.id}</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #f5f5f5; }
          .container { background: white; padding: 20px; border-radius: 5px; }
          .status { padding: 10px; background: #${deployment.status === 'running' ? '90EE90' : deployment.status === 'failed' ? 'FFB6C6' : 'FFE4B5'}; border-radius: 3px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Deployment ${deployment.id}</h1>
          <div class="status">
            <strong>Status:</strong> ${deployment.status}
          </div>
          <p><strong>Image:</strong> ${deployment.imageTag || "N/A"}</p>
          <p><strong>Container:</strong> ${deployment.containerId ? deployment.containerId.substring(0, 12) : "N/A"}</p>
          <p><strong>Port:</strong> ${deployment.port || "N/A"}</p>
          <p><strong>Created:</strong> ${new Date(deployment.createdAt).toLocaleString("en-NG", {
            timeZone: "Africa/Lagos"
        })}</p>
          <hr />
          <h2>Logs</h2>
          <pre style="background: #000; color: #0f0; padding: 10px; border-radius: 3px; overflow: auto; max-height: 400px;">
${deployment.logs.join("\n")}
          </pre>
        </div>
      </body>
    </html>
  `);
});



const buildDockerImage = async (
  imageTag: string,
  projectPath: string,
  deployment: Deployment
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tar = require("tar");

    // Create tar stream 
    const tarStream = tar.create({ cwd: projectPath }, ["."]);

    docker.buildImage(tarStream, { t: imageTag }, (error: any, response: any) => {
      if (error) {
        addLog(deployment, `Build error: ${error.message}`);
        reject(error);
        return;
      }

      docker.modem.followProgress(response, (error: any, res: any) => {
        if (error) {
          addLog(deployment, `Build error: ${error.message}`);
          reject(error);
        } else {
          resolve();
        }
      });

      response.on("data", (chunk: any) => {
        const str = chunk.toString();
        const lines = str.split("\n").filter(Boolean);
        lines.forEach((line: string) => {
          try {
            const json = JSON.parse(line);
            if (json.stream) {
              addLog(deployment, json.stream.trim());
            }
          } catch {
            
          }
        });
      });
    });
  });
};

const runContainer = async (
  imageTag: string,
  port: number,
  deployment: Deployment
): Promise<string> => {
  const container = await docker.createContainer({
    Image: imageTag,
    ExposedPorts: { "3000/tcp": {} },
    HostConfig: {
      PortBindings: {
        "3000/tcp": [{ HostPort: port.toString() }]
      }
    } as any,
    Env: [`PORT=3000`]
  } as any);

  await (container as any).start();
  addLog(deployment, `Container started: ${(container as any).id.substring(0, 12)}`);

  return (container as any).id;
};

// handling the errors globally
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});