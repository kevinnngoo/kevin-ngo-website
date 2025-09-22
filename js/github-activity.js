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
    // Preload all years (2023, 2024, 2025)
    this.availableYears = [2023, 2024, 2025];
    this.yearData = {};
    this.selectedYear = new Date().getFullYear();
    for (const year of this.availableYears) {
      await this.fetchYearData(year);
    }
    this.render();
  }

  /**
   * Load GitHub activity data with caching
   */
  async fetchYearData(year) {
    try {
      const res = await fetch(`/api/github-stats?username=${this.username}&year=${year}`);
      if (!res.ok) throw new Error(`Failed to fetch data for year ${year}`);
      const data = await res.json();
      this.yearData[year] = data.contributions;
      // Use the first year loaded as the default for selectedYear if not set
      if (!this.selectedYear) this.selectedYear = year;
    } catch (error) {
      console.error('GitHub Activity: Error fetching year data:', error);
      this.yearData[year] = { totalCommits: 0, totalPRs: 0, totalIssues: 0, calendar: [] };
    }
  }

  /**
   * Fetch fresh data from GitHub's public REST API (no token required)
   */
  async fetchFreshData(cacheKey) {
    try {
      console.log('GitHub Activity: Making API calls to GitHub public API...');
      
      // Use GitHub's public REST API endpoints
      const [userResponse, reposResponse, eventsResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${this.username}`),
        fetch(`https://api.github.com/users/${this.username}/repos?sort=pushed&per_page=100`),
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

      console.log('GitHub Activity: Processing data...');
      console.log('- Repos found:', repos.length);
      console.log('- Events found:', events.length);

      // Process events to get contribution stats
      const contributions = this.processEvents(events);
      
      // Process repositories for language stats
      const topLanguages = this.processLanguages(repos);

      const normalizedData = {
        contributions,
        topLanguages,
        user: {
          name: user.name,
          login: user.login,
          avatar_url: user.avatar_url,
          public_repos: user.public_repos
        },
        timestamp: new Date().toISOString()
      };

      console.log('GitHub Activity: Data processed successfully');
      console.log('- Contributions:', contributions);
      console.log('- Top languages:', topLanguages);

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
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let totalCommits = 0;
    let totalPRs = 0;
    let totalIssues = 0;
    const calendar = [];

    // Generate last 365 days for contribution calendar
    for (let i = 364; i >= 0; i--) {
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
      if (eventDate >= oneYearAgo) {
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
            if (event.payload.action === 'opened') {
              totalPRs++;
            }
            break;
          case 'IssuesEvent':
            if (event.payload.action === 'opened') {
              totalIssues++;
            }
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
  processLanguages(repos) {
    const languageCount = new Map();
    let totalSize = 0;
    
    // Count languages from repositories (use size as weight)
    repos.forEach(repo => {
      if (repo.language && repo.size > 0) {
        const currentCount = languageCount.get(repo.language) || 0;
        languageCount.set(repo.language, currentCount + repo.size);
        totalSize += repo.size;
      }
    });

    // Convert to percentage-based array
    const languages = Array.from(languageCount.entries())
      .map(([name, size]) => ({
        name,
        color: this.getLanguageColor(name),
        percentage: totalSize > 0 ? (size / totalSize) * 100 : 0,
        size
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8); // Top 8 languages

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
      'Dart': '#00B4AB',
      'Jupyter Notebook': '#DA5B0B',
      'Dockerfile': '#384d54'
    };
    return colors[language] || '#858585';
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
    if (!this.yearData || !this.yearData[this.selectedYear]) return;

    this.container.innerHTML = `
      <div class="github-activity__content">
        ${this.renderStats()}
        <!-- Top Languages - Full Width -->
        <div class="chart__section chart__section--full">
          <h3 class="chart__title">Top Languages</h3>
          ${this.renderLanguagesChart()}
        </div>
        <!-- Contribution Activity - Full Width Below -->
        <div class="chart__section chart__section--full">
          ${this.renderHeatmap()}
        </div>
      </div>
    `;

    // Initialize charts after DOM is ready
    setTimeout(() => {
      this.initializeHeatmap();
      this.initializeLanguagesChart();
      // Attach year toggle events
      const yearBtns = document.querySelectorAll('.year__button');
      yearBtns.forEach(btn => {
        btn.onclick = (e) => {
          yearBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedYear = parseInt(btn.dataset.year);
          this.render();
        };
      });
    }, 0);
  }

  /**
   * Render statistics section
   */
  renderStats() {
    const contributions = this.yearData[this.selectedYear] || { totalCommits: 0, totalPRs: 0, totalIssues: 0 };
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
    const years = this.availableYears;
    const selectedYear = this.selectedYear;
    const yearData = this.yearData[selectedYear]?.calendar || [];
    const totalContributions = yearData.reduce((sum, day) => sum + day.count, 0);
    return `
      <div class="activity__heatmap">
        <div class="chart__container">
          <div class="heatmap__header" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-color);">
              ${totalContributions} contributions in the last year
            </div>
            <div class="year__selector" style="display: flex; gap: 0.5rem;">
              ${years.map(year => `
                <button class="year__button ${year === selectedYear ? 'active' : ''}" data-year="${year}">
                  ${year}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="heatmap__content">
            <div id="contributionHeatmap" class="chart__content" role="img" aria-label="GitHub contribution heatmap">
              <!-- Heatmap will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;
  }



  /**
   * Initialize heatmap after DOM is rendered
   */
  initializeHeatmap() {
    const selectedYear = this.selectedYear;
    const yearData = this.yearData[selectedYear]?.calendar || [];
    if (window.GitHubCharts) {
      new window.GitHubCharts.ContributionHeatmap('contributionHeatmap', {
        data: yearData,
        width: 600,
        height: 100,
        year: selectedYear
      });
    } else {
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
   * Render languages chart HTML
   */
  renderLanguagesChart() {
    return `
      <div class="chart__container">
        <div class="chart__content">
          <canvas id="languagesChart" width="300" height="300"></canvas>
        </div>
      </div>
    `;
  }

  /**
   * Initialize languages donut chart
   */
  initializeLanguagesChart() {
    if (!this.data || !this.data.topLanguages || this.data.topLanguages.length === 0) {
      console.log('No language data available');
      return;
    }

    const canvas = document.getElementById('languagesChart');
    if (!canvas) {
      console.error('Languages chart canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    const languages = this.data.topLanguages.slice(0, 6); // Top 6 languages
    
    // Chart dimensions
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const outerRadius = 100;
    const innerRadius = 60;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate angles
    let currentAngle = -Math.PI / 2; // Start at top
    
    languages.forEach((lang, index) => {
      const sliceAngle = (lang.percentage / 100) * 2 * Math.PI;
      
      // Draw slice
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      
      ctx.fillStyle = lang.color;
      ctx.fill();
      
      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (lang.percentage > 5) { // Only show label if slice is big enough
        ctx.fillText(`${lang.percentage.toFixed(1)}%`, labelX, labelY);
      }
      
      currentAngle += sliceAngle;
    });
    
    // Draw legend
    this.drawLanguagesLegend(languages);
  }

  /**
   * Draw legend for languages chart
   */
  drawLanguagesLegend(languages) {
    const legendContainer = document.querySelector('.chart__section h3');
    if (!legendContainer) return;
    
    const legend = document.createElement('div');
    legend.className = 'chart__legend';
    legend.innerHTML = languages.map(lang => `
      <div class="legend__item">
        <div class="legend__color" style="background-color: ${lang.color}"></div>
        <span class="legend__label">${lang.name} (${lang.percentage.toFixed(1)}%)</span>
      </div>
    `).join('');
    
    // Insert legend after the chart
    const chartSection = legendContainer.parentElement;
    const existingLegend = chartSection.querySelector('.chart__legend');
    if (existingLegend) {
      existingLegend.remove();
    }
    chartSection.appendChild(legend);
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
