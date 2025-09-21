/**
 * GitHub Activity Component
 * Fetches and displays GitHub activity data with caching and fallback
 */

import cacheManager from './cache-manager.js';

class GitHubActivity {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.username = options.username || 'kevinnngoo';
    this.apiEndpoint = options.apiEndpoint || null; // Will use direct GitHub API
    this.githubToken = options.githubToken || null; // Token should be provided securely
    this.isLoading = false;
    this.data = null;
    this.error = null;

    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    this.init();
  }

  /**
   * Initialize the component
   */
  async init() {
    console.log('GitHub Activity: Initializing component for user:', this.username);
    this.renderSkeleton();
    console.log('GitHub Activity: Skeleton rendered, loading data...');
    await this.loadData();
  }

  /**
   * Load GitHub activity data with caching
   */
  async loadData() {
    console.log('GitHub Activity: Starting loadData for user:', this.username);
    this.isLoading = true;
    this.error = null;

    try {
      // Check cache first
      const cacheKey = this.username;
      console.log('GitHub Activity: Checking cache for key:', cacheKey);
      const cachedData = cacheManager.get(cacheKey);

      if (cachedData) {
        console.log('GitHub Activity: Using cached data');
        this.data = cachedData;
        this.render();
        
        // Still fetch fresh data in background for next time
        this.fetchFreshData(cacheKey);
        return;
      }

      console.log('GitHub Activity: No cache found, fetching fresh data...');
      // No cache, fetch fresh data
      await this.fetchFreshData(cacheKey);

    } catch (error) {
      console.error('GitHub Activity: Error loading data:', error);
      this.error = error.message;
      this.renderError();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fetch fresh data from GitHub's public REST API (no token required)
   */
  async fetchFreshData(cacheKey) {
    try {
      console.log('GitHub Activity: Making API calls to GitHub...');
      
      // Use public REST API endpoints instead of GraphQL
      const [userResponse, reposResponse, eventsResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${this.username}`),
        fetch(`https://api.github.com/users/${this.username}/repos?sort=pushed&per_page=6`),
        fetch(`https://api.github.com/users/${this.username}/events/public?per_page=100`)
      ]);

      console.log('GitHub Activity: API responses received');
      console.log('- User response status:', userResponse.status);
      console.log('- Repos response status:', reposResponse.status);
      console.log('- Events response status:', eventsResponse.status);

      if (!userResponse.ok || !reposResponse.ok || !eventsResponse.ok) {
        const errorMsg = `GitHub API request failed: User: ${userResponse.status}, Repos: ${reposResponse.status}, Events: ${eventsResponse.status}`;
        console.error('GitHub Activity:', errorMsg);
        throw new Error(errorMsg);
      }

      const [user, repos, events] = await Promise.all([
        userResponse.json(),
        reposResponse.json(),
        eventsResponse.json()
      ]);

      // Process events to get contribution stats
      const contributions = this.processEvents(events);
      
      // Process repositories for language stats
      const languages = await this.processRepositories(repos);

      const normalizedData = {
        contributions,
        topLanguages: languages,
        repos: repos.map(repo => ({
          name: repo.name,
          description: repo.description || '',
          url: repo.html_url,
          stars: repo.stargazers_count,
          language: repo.language ? {
            name: repo.language,
            color: this.getLanguageColor(repo.language)
          } : null,
          pushedAt: repo.pushed_at
        })),
        timestamp: new Date().toISOString()
      };

      this.data = normalizedData;
      cacheManager.set(cacheKey, normalizedData);

      if (!this.isLoading) {
        this.render();
      } else {
        this.render();
      }

    } catch (error) {
      if (this.data) {
        // We have cached data, just log the error
        console.warn('Failed to fetch fresh data, using cached version:', error);
      } else {
        // No cached data, show error
        throw error;
      }
    }
  }

  /**
   * Process GitHub events to get contribution statistics
   */
  processEvents(events) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let totalCommits = 0;
    let totalPRs = 0;
    let totalIssues = 0;
    const calendar = [];

    // Generate last 30 days for simple calendar
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      calendar.push({
        date: date.toISOString().split('T')[0],
        count: 0,
        weekday: date.getDay()
      });
    }

    events.forEach(event => {
      const eventDate = new Date(event.created_at);
      if (eventDate >= thirtyDaysAgo) {
        const dateString = eventDate.toISOString().split('T')[0];
        const calendarDay = calendar.find(day => day.date === dateString);
        
        if (calendarDay) {
          calendarDay.count++;
        }

        switch (event.type) {
          case 'PushEvent':
            totalCommits += event.payload.commits ? event.payload.commits.length : 1;
            break;
          case 'PullRequestEvent':
            totalPRs++;
            break;
          case 'IssuesEvent':
            totalIssues++;
            break;
        }
      }
    });

    return {
      totalCommits,
      totalPRs,
      totalIssues,
      calendar
    };
  }

  /**
   * Process repositories to get language statistics
   */
  async processRepositories(repos) {
    const languageCount = new Map();
    
    // Count languages from repositories
    repos.forEach(repo => {
      if (repo.language) {
        languageCount.set(repo.language, (languageCount.get(repo.language) || 0) + 1);
      }
    });

    // Convert to percentage-based array
    const totalRepos = repos.filter(repo => repo.language).length;
    const languages = Array.from(languageCount.entries())
      .map(([name, count]) => ({
        name,
        color: this.getLanguageColor(name),
        percentage: totalRepos > 0 ? (count / totalRepos) * 100 : 0
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8);

    return languages;
  }

  /**
   * Get color for programming language
   */
  getLanguageColor(language) {
    const colors = {
      'JavaScript': '#f1e05a',
      'Python': '#3572A5',
      'Java': '#b07219',
      'TypeScript': '#2b7489',
      'C++': '#f34b7d',
      'C': '#555555',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'Swift': '#ffac45',
      'Kotlin': '#F18E33',
      'C#': '#239120',
      'Shell': '#89e051',
      'Vue': '#2c3e50',
      'React': '#61dafb',
      'Dart': '#00B4AB'
    };
    return colors[language] || '#858585';
  }

  /**
   * Aggregates language data (simplified version for public API)
   */
  aggregateLanguages(repos) {
    // This method is now simplified since we're using the public API
    // The actual language processing is done in processRepositories
    return this.processRepositories(repos);
  }

  /**
   * Render loading skeleton
   */
  renderSkeleton() {
    this.container.innerHTML = `
      <div class="github-activity__skeleton" aria-label="Loading GitHub activity">
        <div class="activity__stats">
          <div class="stat__item skeleton">
            <div class="stat__number skeleton__text"></div>
            <div class="stat__label skeleton__text"></div>
          </div>
          <div class="stat__item skeleton">
            <div class="stat__number skeleton__text"></div>
            <div class="stat__label skeleton__text"></div>
          </div>
          <div class="stat__item skeleton">
            <div class="stat__number skeleton__text"></div>
            <div class="stat__label skeleton__text"></div>
          </div>
        </div>
        
        <div class="activity__charts">
          <div class="chart__container skeleton">
            <div class="chart__title skeleton__text"></div>
            <div class="chart__content skeleton__chart"></div>
          </div>
          <div class="chart__container skeleton">
            <div class="chart__title skeleton__text"></div>
            <div class="chart__content skeleton__heatmap"></div>
          </div>
        </div>
        
        <div class="activity__repos">
          <div class="repos__title skeleton__text"></div>
          <div class="repos__list">
            ${Array(6).fill(0).map(() => `
              <div class="repo__item skeleton">
                <div class="repo__name skeleton__text"></div>
                <div class="repo__description skeleton__text"></div>
                <div class="repo__meta skeleton__text"></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the main content
   */
  render() {
    if (!this.data) return;

    this.container.innerHTML = `
      <div class="github-activity__content">
        ${this.renderStats()}
        ${this.renderHeatmap()}
      </div>
    `;

    // Initialize heatmap after DOM is ready
    setTimeout(() => {
      this.initializeHeatmap();
    }, 0);
  }

  /**
   * Render statistics section
   */
  renderStats() {
    const { contributions } = this.data;
    
    return `
      <div class="activity__stats">
        <div class="stat__item">
          <div class="stat__number">${contributions.totalCommits.toLocaleString()}</div>
          <div class="stat__label">Commits</div>
        </div>
        <div class="stat__item">
          <div class="stat__number">${contributions.totalPRs.toLocaleString()}</div>
          <div class="stat__label">Pull Requests</div>
        </div>
        <div class="stat__item">
          <div class="stat__number">${contributions.totalIssues.toLocaleString()}</div>
          <div class="stat__label">Issues</div>
        </div>
      </div>
    `;
  }

  /**
   * Render heatmap section
   */
  renderHeatmap() {
    return `
      <div class="activity__heatmap">
        <div class="chart__container">
          <h3 class="chart__title">Contribution Activity</h3>
          <div id="contributionHeatmap" class="chart__content" role="img" aria-label="GitHub contribution heatmap for the past year">
            <!-- Heatmap will be rendered here -->
          </div>
        </div>
      </div>
    `;
  }



  /**
   * Initialize heatmap after DOM is rendered
   */
  initializeHeatmap() {
    if (window.GitHubCharts) {
      // Initialize contribution heatmap
      const heatmap = new window.GitHubCharts.ContributionHeatmap('contributionHeatmap', {
        data: this.data.contributions.calendar,
        width: 800,
        height: 120
      });
    } else {
      // Fallback to simple text if charts not loaded
      this.renderSimpleHeatmap();
    }
  }

  /**
   * Render simple text-based heatmap as fallback
   */
  renderSimpleHeatmap() {
    // Simple contribution summary
    const heatmap = document.getElementById('contributionHeatmap');
    if (heatmap) {
      const totalContributions = this.data.contributions.calendar.reduce((sum, day) => sum + day.count, 0);
      heatmap.innerHTML = `
        <div class="simple-chart">
          <p>Total contributions this year: <strong>${totalContributions.toLocaleString()}</strong></p>
          <p>Most active day: <strong>${this.getMostActiveDay()}</strong></p>
        </div>
      `;
    }
  }

  /**
   * Get the most active day from contribution data
   */
  getMostActiveDay() {
    const calendar = this.data.contributions.calendar;
    const mostActive = calendar.reduce((max, day) => day.count > max.count ? day : max, { count: 0, date: '' });
    return mostActive.count > 0 ? `${mostActive.count} contributions on ${this.formatDate(mostActive.date)}` : 'No contributions yet';
  }

  /**
   * Render error state
   */
  renderError() {
    this.container.innerHTML = `
      <div class="github-activity__error">
        <div class="error__icon">⚠️</div>
        <div class="error__message">
          <h3>Unable to load GitHub activity</h3>
          <p>${this.error || 'An unexpected error occurred'}</p>
          <button class="error__retry" onclick="window.githubActivity.loadData()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  /**
   * Refresh data (bypass cache)
   */
  async refresh() {
    const cacheKey = this.username;
    cacheManager.remove(cacheKey);
    await this.loadData();
  }
}

// Export for use in other modules
export default GitHubActivity;
