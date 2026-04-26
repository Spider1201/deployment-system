import fs from "fs";
import path from "path";

export type AppType = "node" | "python" | "ruby" | "go" | "unknown";

export interface DetectionResult {
  type: AppType;
  port: number;
  runtime: string;
  buildCmd: string;
  startCmd: string;
}

/**
 * Detect application type from source files (like Railpack does)
 * Returns framework detection and optimal configuration
 */
export const detectApp = (projectPath: string): DetectionResult => {
  // Check for package.json (Node.js)
  if (fs.existsSync(path.join(projectPath, "package.json"))) {
    return {
      type: "node",
      port: 3000,
      runtime: "node:22-slim",
      buildCmd: "npm ci --only=production",
      startCmd: "npm start"
    };
  }

  // Check for requirements.txt (Python)
  if (fs.existsSync(path.join(projectPath, "requirements.txt"))) {
    return {
      type: "python",
      port: 8000,
      runtime: "python:3.11-slim",
      buildCmd: "pip install -r requirements.txt",
      startCmd: 'gunicorn app:app --bind 0.0.0.0:8000 || python app.py'
    };
  }

  // Check for Gemfile (Ruby)
  if (fs.existsSync(path.join(projectPath, "Gemfile"))) {
    return {
      type: "ruby",
      port: 3000,
      runtime: "ruby:3.3-slim",
      buildCmd: "bundle install",
      startCmd: "bundle exec rails s -b 0.0.0.0"
    };
  }

  // Check for go.mod (Go)
  if (fs.existsSync(path.join(projectPath, "go.mod"))) {
    return {
      type: "go",
      port: 8080,
      runtime: "golang:1.22",
      buildCmd: "go build -o app",
      startCmd: "./app"
    };
  }

  // Default: Node.js
  return {
    type: "unknown",
    port: 3000,
    runtime: "node:22-slim",
    buildCmd: "npm ci --only=production || true",
    startCmd: "npm start || node server.js"
  };
};

/**
 * Generate optimal Dockerfile based on detected app type
 * (Equivalent to what Railpack does)
 */
export const generateDockerfile = (projectPath: string): string => {
  const detection = detectApp(projectPath);

  const dockerfileContent = `# Dockerfile generated automatically based on app detection (like Railpack)
# Framework detected: ${detection.type}
FROM ${detection.runtime}

WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json* requirements.txt* Gemfile* go.mod* go.sum* ./

# Install dependencies
RUN ${detection.buildCmd}

# Copy application code
COPY . .

# Expose port
EXPOSE ${detection.port}

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${detection.port}/ || exit 1

# Start application
CMD ["sh", "-c", "${detection.startCmd}"]
`;

  return dockerfileContent;
};

/**
 * Write generated Dockerfile to project
 */
export const writeDockerfile = (projectPath: string): void => {
  const dockerfile = generateDockerfile(projectPath);
  const dockerfilePath = path.join(projectPath, "Dockerfile");
  fs.writeFileSync(dockerfilePath, dockerfile);
};
