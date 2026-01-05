// Health check endpoint - reports backend status
// v1.1.0 - Fixed URLs for all backends

const BACKENDS = [
  { name: "azure-east", url: "https://sm-mcp-gateway.lemoncoast-87756bcf.eastus.azurecontainerapps.io" },
  { name: "azure-west", url: "https://sm-mcp-gateway-west.nicecliff-a1c1a3b6.westus2.azurecontainerapps.io" },
  { name: "aws-east", url: "https://sm-mcp-gateway-aws.vercel.app" }
];

async function checkBackend(backend) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    // Query actual MCP tools/list - the real test of functionality
    const resp = await fetch(`${backend.url}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (resp.ok) {
      const data = await resp.json();
      const tools = data.result?.tools || [];
      return { 
        name: backend.name, 
        healthy: tools.length > 0, 
        tools: tools.length 
      };
    }
    return { name: backend.name, healthy: false, tools: 0, error: `HTTP ${resp.status}` };
  } catch (e) {
    return { name: backend.name, healthy: false, tools: 0, error: e.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const statuses = await Promise.all(BACKENDS.map(checkBackend));
  const activeBackend = statuses.find(s => s.healthy) || statuses[0];
  
  return res.json({
    gateway: "sm-mcp-gateway-vercel",
    status: statuses.some(s => s.healthy) ? "healthy" : "degraded",
    backends: statuses,
    active: activeBackend.name,
    total_healthy: statuses.filter(s => s.healthy).length
  });
}
