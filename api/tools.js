// Tools listing endpoint - proxies to backend /tools

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
        if (data.total_tools > 0) return backend;
      }
    } catch (e) { /* continue */ }
  }
  return BACKENDS[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const backend = await getHealthyBackend();
  
  try {
    const proxyResp = await fetch(`${backend.url}/tools`);
    const data = await proxyResp.json();
    
    res.setHeader('X-SM-Backend', backend.name);
    return res.json({
      ...data,
      via: "vercel-gateway",
      backend: backend.name
    });
  } catch (e) {
    return res.status(502).json({ error: `Backend error: ${e.message}` });
  }
}
