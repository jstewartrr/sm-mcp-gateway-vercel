// Health check endpoint - reports backend status

const BACKENDS = [
  { name: "azure-east", url: "https://sm-mcp-gateway.lemoncoast-87756bcf.eastus.azurecontainerapps.io" },
  { name: "azure-west", url: "https://sm-mcp-gateway-west.nicecliff-a1c1a3b6.westus2.azurecontainerapps.io" },
  { name: "aws-east", url: "https://mamktfczh9.us-east-1.awsapprunner.com" }
];

async function checkBackend(backend) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const resp = await fetch(`${backend.url}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (resp.ok) {
      const data = await resp.json();
      return { 
        name: backend.name, 
        healthy: data.total_tools > 0, 
        tools: data.total_tools || 0 
      };
    }
    return { name: backend.name, healthy: false, tools: 0, error: `HTTP ${resp.status}` };
  } catch (e) {
    return { name: backend.name, healthy: false, tools: 0, error: e.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const statuses = await Promise.all(BACKENDS.map(checkBackend));
  const activeBackend = statuses.find(s => s.healthy) || statuses[0];
  
  return res.json({
    gateway: "sm-mcp-gateway-vercel",
    status: "healthy",
    backends: statuses,
    active: activeBackend.name,
    total_healthy: statuses.filter(s => s.healthy).length
  });
}
