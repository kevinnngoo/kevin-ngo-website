// GitHub Stats API - Serverless function for fetching GitHub GraphQL data
// Environment variable required: GITHUB_TOKEN

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username = 'kevinnngoo' } = req.query;

  if (!process.env.GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN environment variable is not set');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GITHUB') || k.includes('TOKEN')));
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'GitHub token not configured',
      debug: 'Check Vercel environment variables'
    });
  }

  try {
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalPullRequestContributions
            totalIssueContributions
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  weekday
                }
              }
            }
          }
        }
      }
    `;

    // Calculate date range for the last year
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { 
          username,
          from: from.toISOString(),
          to: to.toISOString()
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('GraphQL query failed');
    }

    if (!data.data?.user) {
      throw new Error('User not found');
    }

    // Normalize the data
    const user = data.data.user;
    const normalizedData = {
      contributions: {
        totalCommits: user.contributionsCollection.totalCommitContributions,
        totalPRs: user.contributionsCollection.totalPullRequestContributions,
        totalIssues: user.contributionsCollection.totalIssueContributions,
        calendar: user.contributionsCollection.contributionCalendar.weeks.flatMap(week =>
          week.contributionDays.map(day => ({
            date: day.date,
            count: day.contributionCount,
            weekday: day.weekday
          }))
        ),
        totalContributions: user.contributionsCollection.contributionCalendar.totalContributions
      },
      timestamp: new Date().toISOString()
    };

    // Cache for 5 minutes on the server side
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json(normalizedData);

  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch GitHub data',
      message: error.message 
    });
  }
}
