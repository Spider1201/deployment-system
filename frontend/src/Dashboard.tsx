import { useState } from "react";

export default function Dashboard() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [gitUrl, setGitUrl] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

  // In Docker, use relative paths to let the browser talk through Caddy
  // In dev, use localhost:5000 directly
  const apiUrl = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "";

  const deploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl.trim()) {
      alert("Please enter a Git URL");
      return;
    }

    setIsDeploying(true);

    try {
      const formData = new FormData();
      formData.append("gitUrl", gitUrl);

      const res = await fetch(`${apiUrl}/deploy`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      setDeployments((prev) => [data, ...prev]);
      setSelectedDeploymentId(data.id);
      setGitUrl("");

      listenLogs(data.id);
    } catch (err) {
      alert(`Deploy failed: ${err}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const loadDeployments = async () => {
    const res = await fetch(`${apiUrl}/deployments`);
    const data = await res.json();
    setDeployments(data);
  };

  const listenLogs = (id: string) => {
    setLogs([]);
    setSelectedDeploymentId(id);

    const es = new EventSource(
      `${apiUrl}/logs/${id}`
    );

    es.onmessage = (e) => {
      setLogs((prev) => [...prev, e.data]);
    };

    es.onerror = () => {
      es.close();
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "#90EE90";
      case "failed":
        return "#FFB6C6";
      case "building":
      case "deploying":
        return "#FFE4B5";
      default:
        return "#E0E0E0";
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Mini PaaS Dashboard</h1>

      <div style={{
        background: "#f5f5f5",
        padding: 20,
        borderRadius: 5,
        marginBottom: 20
      }}>
        <h2>New Deployment</h2>
        <form onSubmit={deploy}>
          <input
            type="text"
            placeholder="Enter a Git repository URL (e.g., https://github.com/user/repo.git)"
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 10,
              border: "1px solid #ccc",
              borderRadius: 3,
              boxSizing: "border-box"
            }}
            disabled={isDeploying}
          />
          <button
            type="submit"
            disabled={isDeploying}
            style={{
              padding: "10px 20px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: 3,
              cursor: isDeploying ? "not-allowed" : "pointer",
              opacity: isDeploying ? 0.6 : 1,
              marginRight: 10
            }}
          >
            {isDeploying ? "Deploying..." : "Deploy"}
          </button>
          <button
            type="button"
            onClick={loadDeployments}
            style={{
              padding: "10px 20px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 3,
              cursor: "pointer"
            }}
          >
            Refresh
          </button>
        </form>
      </div>

      <h2>Deployments ({deployments.length})</h2>
      {deployments.length === 0 ? (
        <p style={{ color: "#999" }}>No deployments yet. Create one above.</p>
      ) : (
        deployments.map((d) => (
          <div
            key={d.id}
            onClick={() => listenLogs(d.id)}
            style={{
              border: selectedDeploymentId === d.id ? "2px solid #007bff" : "1px solid #ccc",
              padding: 15,
              marginBottom: 10,
              cursor: "pointer",
              backgroundColor: selectedDeploymentId === d.id ? "#f0f7ff" : "white",
              borderRadius: 5
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "5px 0" }}>
                  <strong>ID:</strong> {d.id.substring(0, 10)}...
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Image:</strong> {d.imageTag || "N/A"}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Port:</strong> {d.port || "N/A"}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Route:</strong> {d.route}
                </p>
              </div>
              <div
                style={{
                  background: getStatusColor(d.status),
                  padding: 15,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  minWidth: 100
                }}
              >
                {d.status}
              </div>
            </div>
          </div>
        ))
      )}

      <h2>Logs</h2>
      <div
        style={{
          background: "#000",
          color: "#0f0",
          height: 400,
          overflow: "auto",
          padding: 10,
          fontFamily: "monospace",
          fontSize: 12,
          borderRadius: 3,
          border: "1px solid #333"
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: "#666" }}>
            Select a deployment to view logs
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ whiteSpace: "pre-wrap" }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}