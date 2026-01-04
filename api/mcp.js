// MCP Protocol handler - proxies requests to healthy backend

const BACKENDS = [
  { name: "azure-east", url: "https://sm-mcp-gateway.lemoncoast-87756bcf.eastus.azurecontainerapps.io" },
  { name: "azure-west", url: "https://sm-mcp-gateway-west.nicecliff-a1c1a3b6.westus2.azurecontainerapps.io" },
  { name: "aws-east", url: "https://mamktfczh9.us-east-1.awsapprunner.com" }
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
      console.log(`Backend ${backend.name} check failed: ${e.message}`);
    }
  }
  return BACKENDS[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST for MCP.' });
  }
  
  const backend = await getHealthyBackend();
  
  try {
    const proxyResp = await fetch(`${backend.url}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await proxyResp.json();
    
    res.setHeader('X-SM-Backend', backend.name);
    return res.status(proxyResp.status).json(data);
  } catch (e) {
    console.error(`Proxy error: ${e.message}`);
    return res.status(502).json({
      jsonrpc: "2.0",
      id: req.body?.id || 1,
      error: {
        code: -32603,
        message: `Backend proxy error: ${e.message}`
      }
    });
  }
}
