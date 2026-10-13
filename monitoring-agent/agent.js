
const os = require("node:os");
const si = require("systeminformation");

const API_URL =
  process.env.CLOUDPULSE_API_URL || "http://localhost:5000";

const INTERVAL_MS = 10_000;

async function collectMetrics() {
  const [cpuData, memoryData, diskData, networkData] =
    await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats()
    ]);

  const disk = diskData.find(
    (item) => item.size > 0 && item.fs
  ) || diskData.find((item) => item.size > 0);

  if (!disk) {
    throw new Error("No disk usage information is available");
  }

  const network = networkData.reduce(
    (total, item) => ({
      rxBytesPerSecond: total.rxBytesPerSecond +
        Math.max(0, item.rx_sec || 0),
      txBytesPerSecond: total.txBytesPerSecond +
        Math.max(0, item.tx_sec || 0)
    }),
    {
      rxBytesPerSecond: 0,
      txBytesPerSecond: 0
    }
  );

  return {
    hostname: os.hostname(),
    cpu: {
      usagePercent: Number(cpuData.currentLoad.toFixed(2))
    },
    memory: {
      totalBytes: memoryData.total,
      usedBytes: memoryData.active,
      usagePercent: Number(
        ((memoryData.active / memoryData.total) * 100).toFixed(2)
      )
    },
    disk: {
      filesystem: disk.fs,
      totalBytes: disk.size,
      usedBytes: disk.used,
      usagePercent: Number(disk.use.toFixed(2))
    },
    network: {
      rxBytesPerSecond: Number(network.rxBytesPerSecond.toFixed(2)),
      txBytesPerSecond: Number(network.txBytesPerSecond.toFixed(2))
    },
    collectedAt: new Date().toISOString()
  };
}

async function sendMetrics() {
  try {
    const metrics = await collectMetrics();

    const response = await fetch(`${API_URL}/api/metrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(metrics),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API returned ${response.status}: ${body}`);
    }

    console.log(
      `[${new Date().toLocaleTimeString()}] Metrics sent | ` +
      `CPU ${metrics.cpu.usagePercent}% | ` +
      `RAM ${metrics.memory.usagePercent}% | ` +
      `Disk ${metrics.disk.usagePercent}%`
    );
  } catch (error) {
    console.error(`[AGENT ERROR] ${error.message}`);
  }
}

console.log(`CloudPulse agent started on ${os.hostname()}`);
console.log(`Sending metrics to ${API_URL}`);
console.log(`Collection interval: ${INTERVAL_MS / 1000} seconds`);

sendMetrics();
setInterval(sendMetrics, INTERVAL_MS);
