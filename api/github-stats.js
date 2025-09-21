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
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'GitHub token not configured'
    });
  }

  try {
    const query = `
      query($username: String!) {
        user(login: $username) {
          contributionsCollection {
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
          repositories(
            first: 6
            orderBy: { field: PUSHED_AT, direction: DESC }
            privacy: PUBLIC
            isFork: false
          ) {
            nodes {
              name
              description
              url
              stargazerCount
              primaryLanguage {
                name
                color
              }
              pushedAt
              languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node {
                    name
                    color
                  }
                }
              }
            }
          }
          repositoriesContributedTo(
            first: 100
            contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
          ) {
            nodes {
              languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node {
                    name
                    color
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username }
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
        )
      },
      topLanguages: aggregateLanguages(user),
      repos: user.repositories.nodes.map(repo => ({
        name: repo.name,
        description: repo.description || '',
        url: repo.url,
        stars: repo.stargazerCount,
        language: repo.primaryLanguage ? {
          name: repo.primaryLanguage.name,
          color: repo.primaryLanguage.color
        } : null,
        pushedAt: repo.pushedAt
      })),
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

/**
 * Aggregates language data from user's repositories and contributions
 * @param {Object} user - GitHub user data from GraphQL
 * @returns {Array} Array of language objects with name, color, and percentage
 */
function aggregateLanguages(user) {
  const languageMap = new Map();
  let totalSize = 0;

  // Process own repositories
  user.repositories.nodes.forEach(repo => {
    repo.languages.edges.forEach(edge => {
      const lang = edge.node;
      const size = edge.size;
      
      if (languageMap.has(lang.name)) {
        languageMap.set(lang.name, {
          ...languageMap.get(lang.name),
          size: languageMap.get(lang.name).size + size
        });
      } else {
        languageMap.set(lang.name, {
          name: lang.name,
          color: lang.color || '#858585',
          size: size
        });
      }
      totalSize += size;
    });
  });

  // Process contributed repositories (with lower weight)
  user.repositoriesContributedTo.nodes.forEach(repo => {
    repo.languages.edges.forEach(edge => {
      const lang = edge.node;
      const size = Math.floor(edge.size * 0.1); // 10% weight for contributions
      
      if (languageMap.has(lang.name)) {
        languageMap.set(lang.name, {
          ...languageMap.get(lang.name),
          size: languageMap.get(lang.name).size + size
        });
      } else {
        languageMap.set(lang.name, {
          name: lang.name,
          color: lang.color || '#858585',
          size: size
        });
      }
      totalSize += size;
    });
  });

  // Convert to array and calculate percentages
  const languages = Array.from(languageMap.values())
    .map(lang => ({
      name: lang.name,
      color: lang.color,
      percentage: totalSize > 0 ? (lang.size / totalSize) * 100 : 0
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8); // Top 8 languages

  return languages;
}

