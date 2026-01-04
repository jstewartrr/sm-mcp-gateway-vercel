// SM MCP Gateway - Vercel Edition
// Proxies to Azure East or AWS backend with failover

const BACKENDS = [
  {
    name: "azure-east",
    url: "https://sm-mcp-gateway.lemoncoast-87756bcf.eastus.azurecontainerapps.io"
  },
  {
    name: "azure-west",
    url: "https://sm-mcp-gateway-west.nicecliff-a1c1a3b6.westus2.azurecontainerapps.io"
  },
  {
    name: "aws-east",
    url: "https://mamktfczh9.us-east-1.awsapprunner.com"
  }
];

async function getHealthyBackend() {
  for (const backend of BACKENDS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const resp = await fetch(`${backend.url}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.total_tools > 0) {
          return backend;
        }
      }
    } catch (e) {
      console.log(`Backend ${backend.name} failed: ${e.message}`);
    }
  }
  return BACKENDS[0]; // Fallback to primary
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Root endpoint - return gateway info
  if (req.method === 'GET') {
    const backend = await getHealthyBackend();
    return res.json({
      gateway: "sm-mcp-gateway-vercel",
      version: "1.0.0",
      status: "healthy",
      active_backend: backend.name,
      backends: BACKENDS.map(b => b.name),
      message: "Vercel MCP Gateway - Azure-independent failover layer"
    });
  }
  
  return res.status(404).json({ error: 'Use /mcp or /health endpoints' });
}
