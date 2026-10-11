
const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Basic API welcome endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to CloudPulse",
    description: "Cloud Infrastructure Monitoring Platform",
    healthEndpoint: "/health"
  });
});

// Health-check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "CloudPulse API",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
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
