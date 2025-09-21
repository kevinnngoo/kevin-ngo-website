/**
 * GitHub Activity Component
 * Fetches and displays GitHub activity data with caching and fallback
 */

import cacheManager from './cache-manager.js';

class GitHubActivity {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.username = options.username || 'kevinnngoo';
    this.apiEndpoint = options.apiEndpoint || '/api/github-stats';
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
    this.renderSkeleton();
    await this.loadData();
  }

  /**
   * Load GitHub activity data with caching
   */
  async loadData() {
    this.isLoading = true;
    this.error = null;

    try {
      // Check cache first
      const cacheKey = this.username;
      const cachedData = cacheManager.get(cacheKey);

      if (cachedData) {
        console.log('Using cached GitHub activity data');
        this.data = cachedData;
        this.render();
        
        // Still fetch fresh data in background for next time
        this.fetchFreshData(cacheKey);
        return;
      }

      // No cache, fetch fresh data
      await this.fetchFreshData(cacheKey);

    } catch (error) {
      console.error('Error loading GitHub activity:', error);
      this.error = error.message;
      this.renderError();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fetch fresh data from API
   */
  async fetchFreshData(cacheKey) {
    try {
      const response = await fetch(`${this.apiEndpoint}?username=${this.username}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      this.data = data;
      cacheManager.set(cacheKey, data);
      
      if (!this.isLoading) {
        // Background update, just update the data silently
        this.render();
      } else {
        // Initial load
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
        ${this.renderCharts()}
        ${this.renderRepos()}
      </div>
    `;

    // Initialize charts after DOM is ready
    setTimeout(() => {
      this.initializeCharts();
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
   * Render charts section
   */
  renderCharts() {
    return `
      <div class="activity__charts">
        <div class="chart__container">
          <h3 class="chart__title">Top Languages</h3>
          <div id="languagesChart" class="chart__content" role="img" aria-label="Programming languages usage chart">
            <!-- Chart will be rendered here -->
          </div>
        </div>
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
   * Render repositories section
   */
  renderRepos() {
    const { repos } = this.data;
    
    return `
      <div class="activity__repos">
        <h3 class="repos__title">Recent Repositories</h3>
        <div class="repos__list">
          ${repos.map(repo => `
            <div class="repo__item">
              <div class="repo__header">
                <a href="${repo.url}" class="repo__name" target="_blank" rel="noopener noreferrer">
                  ${repo.name}
                </a>
                <div class="repo__stars">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                  </svg>
                  ${repo.stars}
                </div>
              </div>
              ${repo.description ? `<p class="repo__description">${repo.description}</p>` : ''}
              <div class="repo__meta">
                ${repo.language ? `
                  <span class="repo__language">
                    <span class="language__color" style="background-color: ${repo.language.color}"></span>
                    ${repo.language.name}
                  </span>
                ` : ''}
                <span class="repo__updated">
                  Updated ${this.formatDate(repo.pushedAt)}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Initialize charts after DOM is rendered
   */
  initializeCharts() {
    if (window.GitHubCharts) {
      // Initialize language donut chart
      const languageChart = new window.GitHubCharts.DonutChart('languagesChart', {
        data: this.data.topLanguages,
        width: 200,
        height: 200
      });

      // Initialize contribution heatmap
      const heatmap = new window.GitHubCharts.ContributionHeatmap('contributionHeatmap', {
        data: this.data.contributions.calendar,
        width: 800,
        height: 120
      });
    } else {
      // Fallback to simple text lists if charts not loaded
      this.renderSimpleCharts();
    }
  }

  /**
   * Render simple text-based charts as fallback
   */
  renderSimpleCharts() {
    // Simple language list
    const languagesChart = document.getElementById('languagesChart');
    if (languagesChart) {
      languagesChart.innerHTML = `
        <div class="simple-chart">
          ${this.data.topLanguages.map(lang => `
            <div class="language-item">
              <span class="language-color" style="background-color: ${lang.color}"></span>
              <span class="language-name">${lang.name}</span>
              <span class="language-percentage">${lang.percentage.toFixed(1)}%</span>
            </div>
          `).join('')}
        </div>
      `;
    }

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

