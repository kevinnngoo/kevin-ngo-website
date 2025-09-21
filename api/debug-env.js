// Debug endpoint to check environment variables
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const hasToken = !!process.env.GITHUB_TOKEN;
    const tokenStart = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.substring(0, 10) + '...' : 'Not found';
    
    return res.status(200).json({
      hasGitHubToken: hasToken,
      tokenPreview: hasToken ? tokenStart : 'Not found',
      allEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('GITHUB') || key.includes('TOKEN')
      ),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Debug endpoint error',
      message: error.message
    });
  }
}