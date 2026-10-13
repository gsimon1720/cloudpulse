
const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "100kb" }));

let latestMetrics = null;

// Welcome endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to CloudPulse",
    description: "Cloud Infrastructure Monitoring Platform",
    healthEndpoint: "/health",
    metricsEndpoint: "/api/metrics/latest"
  });
});

// API health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "CloudPulse API",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Receive metrics from the monitoring agent
app.post("/api/metrics", (req, res) => {
  const { hostname, cpu, memory, disk, network, collectedAt } = req.body;

  if (
    typeof hostname !== "string" ||
    !hostname.trim() ||
    !cpu ||
    !memory ||
    !disk ||
    !network ||
    !Number.isFinite(cpu.usagePercent) ||
    !Number.isFinite(memory.usagePercent) ||
    !Number.isFinite(disk.usagePercent) ||
    !Number.isFinite(network.rxBytesPerSecond) ||
    !Number.isFinite(network.txBytesPerSecond)
  ) {
    return res.status(400).json({
      error: "Invalid or incomplete metrics payload"
    });
  }

  latestMetrics = {
    hostname,
    cpu,
    memory,
    disk,
    network,
    collectedAt:
      typeof collectedAt === "string"
        ? collectedAt
        : new Date().toISOString(),
    receivedAt: new Date().toISOString()
  };

  console.log(
    `[METRICS] ${hostname} | CPU ${cpu.usagePercent}% | ` +
    `RAM ${memory.usagePercent}% | Disk ${disk.usagePercent}%`
  );

  res.status(202).json({
    message: "Metrics received successfully",
    hostname,
    receivedAt: latestMetrics.receivedAt
  });
});

// Retrieve the latest received metrics
app.get("/api/metrics/latest", (req, res) => {
  if (!latestMetrics) {
    return res.status(404).json({
      message: "No metrics received yet. Start the monitoring agent."
    });
  }

  res.json(latestMetrics);
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found"
  });
});

app.listen(PORT, () => {
  console.log(`CloudPulse API running at http://localhost:${PORT}`);
});
