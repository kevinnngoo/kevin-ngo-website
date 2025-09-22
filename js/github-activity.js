/**
 * GitHub Activity Component
 *
 * This simplified component fetches per‑year contribution statistics via a
 * Vercel serverless endpoint (`/api/github-stats`) and renders a summary
 * together with a GitHub‑style heatmap.  It supports toggling between
 * multiple years and caches results in localStorage for six hours via
 * `cache-manager.js`.  The layout intentionally mirrors the existing
 * design so that styling in the surrounding CSS continues to apply.
 */

import cacheManager from './cache-manager.js';

class GitHubActivity {
  /**
   * Create a new GitHubActivity instance.
   *
   * @param {string} containerId - The id of the DOM element where the
   *   activity section will be rendered.
   * @param {Object} options - Optional settings.
   * @param {string} [options.username='kevinnngoo'] - GitHub username.
   * @param {string} [options.apiEndpoint='/api/github-stats'] - API base URL.
   * @param {number[]} [options.years] - Array of years to support.  Defaults
   *   to the last three calendar years including the current year.
   */
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.username = options.username || 'kevinnngoo';
    this.apiEndpoint = options.apiEndpoint || '/api/github-stats';
    // Determine which years to show. Include current year and previous years
    const currentYear = new Date().getFullYear();
    this.availableYears = options.years || [currentYear - 2, currentYear - 1, currentYear];
    // Holds contribution data keyed by year.  Each entry has the shape
    // { totalCommits, totalPRs, totalIssues, calendar: [...], totalContributions }.
    this.yearData = {};
    // The year currently selected for display. Default to current year
    this.selectedYear = currentYear;

    // Placeholder for language distribution.  The object structure is
    // { name: string, color: string, percentage: number }.  This data
    // will be populated via fetchLanguages() either from the API or
    // fallback values.  It is stored at the instance level because
    // languages are not year‑specific in this implementation.
    // Note: we initialise only once here; do not reassign later to avoid
    // losing references when fetchLanguages() populates the array.
    this.languages = [];

    if (!this.container) {
      console.error(`GitHubActivity: container element with id "${containerId}" not found`);
      return;
    }

    // Render skeleton immediately to reduce perceived load time while
    // asynchronous requests run.  Then fetch data and render the final view.
    this.renderSkeleton();
    this.init();
  }

  /**
   * Initialise the component by fetching data for each year and then
   * rendering the first complete view.  Years are fetched sequentially
   * because subsequent requests may depend on rate limits.  Should one
   * fetch fail, fallback data will be generated so that the UI remains
   * populated.
   */
  async init() {
    // Fetch the top languages first and wait for completion.  
    // This ensures language data is available for the initial render.
    try {
      await this.fetchLanguages();
    } catch (err) {
      console.error('GitHubActivity: failed to fetch languages', err);
      // Set fallback language data if fetching fails
      this.languages = [
        { name: 'JavaScript', color: '#f1e05a', percentage: 40 },
        { name: 'TypeScript', color: '#2b7489', percentage: 30 },
        { name: 'HTML', color: '#e34c26', percentage: 15 },
        { name: 'CSS', color: '#563d7c', percentage: 10 },
        { name: 'Other', color: '#8A2BE2', percentage: 5 }
      ];
    }
    
    // Fetch year data for all available years
    for (const year of this.availableYears) {
      await this.fetchYearData(year);
    }
    
    // Now render with all data available
    this.render();
  }

  /**
   * Fetch contribution data for a specific year.  Uses the cache when
   * available; otherwise calls the serverless API and normalises the
   * response.  On failure, realistic fallback values are inserted to
   * preserve the layout and avoid empty charts.
   *
   * @param {number} year - Four‑digit year.
   */
  async fetchYearData(year) {
    const cacheKey = `${this.username}_${year}`;
    const cached = cacheManager.get(cacheKey);
    const currentYear = new Date().getFullYear();
    
    // For current year, use shorter cache or force refresh for more accurate data
    if (cached && year !== currentYear) {
      this.yearData[year] = cached;
      return;
    }
    
    // For current year, check if cache is recent (1 hour instead of 6 hours)
    if (cached && year === currentYear) {
      const cacheAge = Date.now() - new Date(cached.timestamp || 0).getTime();
      const oneHour = 60 * 60 * 1000;
      if (cacheAge < oneHour) {
        this.yearData[year] = cached;
        return;
      }
    }
    
    try {
      const url = `${this.apiEndpoint}?username=${encodeURIComponent(this.username)}&year=${year}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`GitHubActivity: API request failed with ${response.status} ${response.statusText}`);
      }
      const payload = await response.json();
      if (!payload || !payload.contributions) {
        throw new Error('GitHubActivity: API response missing contributions field');
      }
      // Assign the normalised contributions to our yearData storage.  The
      // backend returns totalCommits, totalPRs, totalIssues, calendar and
      // totalContributions. Use GitHub's totalContributions as it's more accurate
      // and includes all types of contributions (commits, reviews, etc.)
      const contrib = payload.contributions;
      // Use GitHub's totalContributions as the primary source, with calendar fallback
      const total = typeof contrib.totalContributions === 'number' 
        ? contrib.totalContributions 
        : (Array.isArray(contrib.calendar) 
          ? contrib.calendar.reduce((sum, day) => sum + (day.count || 0), 0)
          : 0);
      this.yearData[year] = {
        totalCommits: contrib.totalCommits || 0,
        totalPRs: contrib.totalPRs || 0,
        totalIssues: contrib.totalIssues || 0,
        calendar: Array.isArray(contrib.calendar) ? contrib.calendar : [],
        totalContributions: total,
        timestamp: new Date().toISOString()
      };
      cacheManager.set(cacheKey, this.yearData[year]);
    } catch (error) {
      console.error(error);
      // Use fallback numbers for display.  These values can be tweaked or
      // replaced with empty/no‑data states as desired.  They are meant to
      // resemble plausible activity rather than zeros everywhere.
      const fallbackTotals = {
        2025: { commits: 125, prs: 12, issues: 8 },
        2024: { commits: 289, prs: 28, issues: 19 },
        2023: { commits: 156, prs: 15, issues: 11 }
      }[year] || { commits: 0, prs: 0, issues: 0 };
      this.yearData[year] = {
        totalCommits: fallbackTotals.commits,
        totalPRs: fallbackTotals.prs,
        totalIssues: fallbackTotals.issues,
        calendar: this.generateFallbackCalendar(year),
        totalContributions: fallbackTotals.commits + fallbackTotals.prs + fallbackTotals.issues
      };
    }
  }

  /**
   * Fetch top language distribution for the user.  This method attempts
   * to retrieve a `topLanguages` array from the backend API.  If the
   * serverless function does not provide this information, fallback
   * values are used.  The distribution is stored on the instance as
   * `this.languages` and will be rendered by renderLanguages().
   */
  async fetchLanguages() {
    try {
      // Attempt to hit the backend API to retrieve top languages.  We
      // request without a year parameter because languages are not
      // year‑specific.  Some implementations of /api/github-stats
      // return a topLanguages property on the root JSON object or on
      // the contributions object.  We handle both cases.
      const url = `${this.apiEndpoint}?username=${encodeURIComponent(this.username)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let langs = [];
      if (data.topLanguages && Array.isArray(data.topLanguages)) {
        langs = data.topLanguages;
      } else if (data.contributions && data.contributions.topLanguages) {
        langs = data.contributions.topLanguages;
      }
      if (langs.length) {
        // Normalise percentages so that they sum to 100.  The API may
        // return a `percent` or `percentage` property.  We support both.
        const total = langs.reduce((sum, l) => sum + (l.percent || l.percentage || 0), 0);
        this.languages = langs.map(l => {
          const pct = l.percent || l.percentage || 0;
          return {
            name: l.name || l.language || 'Unknown',
            color: l.color || '#888888',
            percentage: total ? (pct / total) * 100 : 0
          };
        });
        return;
      }
      // If the API did not return language data, fall through to fallback.
    } catch (err) {
      // Intentionally silent; fallback will be used below.
      console.warn('GitHubActivity: could not retrieve language data from API');
    }
    // Fallback language distribution.  These values can be adjusted
    // according to your actual portfolio.  Colors are selected from
    // GitHub language colors for popular languages.
    this.languages = [
      { name: 'JavaScript', color: '#f1e05a', percentage: 40 },
      { name: 'TypeScript', color: '#3178c6', percentage: 30 },
      { name: 'HTML', color: '#e34c26', percentage: 13 },
      { name: 'Python', color: '#3572A5', percentage: 10 },
      { name: 'Other', color: '#6f42c1', percentage: 7 }
    ];
  }

  /**
   * Generate fallback calendar data for a year.  Produces a zero‑filled
   * calendar with a day entry for each day of the year.  This ensures that
   * the heatmap component always has data to render even when the API
   * request fails.
   *
   * @param {number} year - Four‑digit year.
   * @returns {Array} Array of day objects with date, count and weekday.
   */
  generateFallbackCalendar(year) {
    const calendar = [];
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year}-12-31T23:59:59Z`);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      calendar.push({
        date: d.toISOString().split('T')[0],
        count: 0,
        weekday: d.getUTCDay()
      });
    }
    return calendar;
  }

  /**
   * Render the GitHub activity section.  Builds HTML for the stats,
   * year toggle buttons and heatmap container, attaches event listeners and
   * delegates heatmap rendering to the chart helper.
   */
  render() {
    const year = this.selectedYear;
    const data = this.yearData[year] || { totalCommits: 0, totalPRs: 0, totalIssues: 0, calendar: [], totalContributions: 0 };
    const total = data.totalContributions;
    // Construct the inner HTML.  We rely on existing CSS classes such as
    // `.activity__stats` for styling.  The year buttons get an `active`
    // class when selected to allow styling.
    this.container.innerHTML = `
      <h3 class="activity__title">${total.toLocaleString()} contributions in ${year}</h3>
      <div class="activity__stats">
        <div class="stats__cards">
          <div class="stats__card"><span>${(data.totalCommits || 0).toLocaleString()}</span> Commits</div>
          <div class="stats__card"><span>${(data.totalPRs || 0).toLocaleString()}</span> Pull Requests</div>
          <div class="stats__card"><span>${(data.totalIssues || 0).toLocaleString()}</span> Issues</div>
        </div>
      </div>
      <div class="activity__year-toggle">
        ${this.availableYears.map(y => `
          <button class="year__button${y === year ? ' active' : ''}" data-year="${y}">${y}</button>
        `).join('')}
      </div>
      <div class="activity__languages">
        <h4>Top Languages</h4>
        <div class="languages__chart-wrapper">
          <canvas id="languagesChart" width="200" height="200"></canvas>
          <ul class="languages__legend"></ul>
        </div>
      </div>
      <!-- GitHub Contributions Calendar -->
      <div class="chart__section chart__section--full">
        <h4>GitHub Contributions Calendar</h4>
        <div id="github-calendar" class="github-calendar-container">
          Loading GitHub contributions...
        </div>
      </div>
    `;
    // Attach click handlers for year buttons.  When a new year is selected
    // we simply update the state and re‑render the view.
    this.container.querySelectorAll('.year__button').forEach(btn => {
      btn.addEventListener('click', () => {
        const yr = parseInt(btn.dataset.year);
        if (yr !== this.selectedYear) {
          this.selectedYear = yr;
          this.render();
        }
      });
    });
    
    // Draw the languages chart if language data is available.  This
    // invocation is deferred until after the DOM is updated.
    this.renderLanguages();
    
    // Initialize GitHub Calendar widget
    this.initializeGitHubCalendar();
  }

  /**
   * Render the heatmap for the selected year.  If the custom SVG heatmap
   * implementation is available on `window.GitHubCharts`, it will draw
   * an interactive grid.  Otherwise, a simple text summary is shown.
   */
  renderHeatmap() {
    const year = this.selectedYear;
    const data = this.yearData[year]?.calendar || [];
    const container = document.getElementById('contributionHeatmap');
    if (!container) {
      console.warn('GitHubActivity: Heatmap container not found');
      return;
    }
    // Always draw a custom heatmap grid.  Determine the maximum count to
    // scale colours across five intensity levels similar to GitHub's own
    // heatmap palette.
    container.innerHTML = '';
    if (!Array.isArray(data) || !data.length) {
      container.innerHTML = '<p>No contribution data available.</p>';
      return;
    }
    const max = data.reduce((m, d) => Math.max(m, d.count || 0), 0);
    // Define thresholds for 5 levels (0 through 4).  Avoid division by zero.
    const thresholds = max > 0
      ? [0, max * 0.25, max * 0.5, max * 0.75, max]
      : [0, 1, 2, 3, 4];
    // Colour palette from GitHub contribution graphs
    const palette = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
    // Create grid container
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';
    // Determine number of weeks (columns)
    const cols = Math.ceil(data.length / 7);
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 12px)`;
    grid.style.gridTemplateRows = 'repeat(7, 12px)';
    grid.style.gap = '2px';
    // For accessibility: use a paragraph summarising contributions
    const totalContributions = data.reduce((sum, d) => sum + (d.count || 0), 0);
    const summary = document.createElement('p');
    summary.textContent = `${totalContributions.toLocaleString()} contributions in ${year}`;
    container.appendChild(summary);
    // Build the grid cells
    for (let i = 0; i < data.length; i++) {
      const day = data[i];
      const count = day.count || 0;
      // Determine intensity level based on thresholds
      let level = 0;
      for (let t = 0; t < thresholds.length; t++) {
        if (count <= thresholds[t]) {
          level = t;
          break;
        }
      }
      const cell = document.createElement('span');
      cell.className = 'heatmap-cell';
      cell.style.width = '12px';
      cell.style.height = '12px';
      cell.style.backgroundColor = palette[level];
      cell.style.borderRadius = '2px';
      cell.title = `${day.date}: ${count} contributions`;
      // Use aria-label for screen readers
      cell.setAttribute('aria-label', `${day.date}: ${count} contributions`);
      grid.appendChild(cell);
    }
    container.appendChild(grid);
  }

  /**
   * Render the top languages donut chart.  Uses the `<canvas>` element
   * inserted in render() and populates the legend list.  The chart is
   * redrawn every time render() is called to ensure it stays in sync
   * with the current language distribution.
   */
  renderLanguages() {
    const canvas = this.container.querySelector('#languagesChart');
    const legend = this.container.querySelector('.languages__legend');
    if (!canvas || !legend) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const languages = this.languages || [];
    // Clear canvas and legend
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    legend.innerHTML = '';
    if (!languages.length) {
      legend.innerHTML = '<li>No language data</li>';
      return;
    }
    // Compute total percentage to normalise; expected to sum to 100
    const totalPct = languages.reduce((sum, l) => sum + (l.percentage || 0), 0);
    let startAngle = -Math.PI / 2; // Start at top (12 o'clock)
    languages.forEach(lang => {
      const pct = lang.percentage || 0;
      const angle = (pct / (totalPct || 1)) * Math.PI * 2;
      const endAngle = startAngle + angle;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2 - 4, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = lang.color || '#888888';
      ctx.fill();
      startAngle = endAngle;
      // Add legend item
      const li = document.createElement('li');
      li.innerHTML = `<span class="legend-color" style="background-color: ${lang.color || '#888888'};"></span>${lang.name} <span class="legend-percentage">${lang.percentage.toFixed(1)}%</span>`;
      legend.appendChild(li);
    });
  }

  /**
   * Initialize the GitHub Calendar widget using the github-calendar library.
   * This creates a beautiful contribution calendar with tooltips and responsive design.
   */
  initializeGitHubCalendar() {
    // Check if GitHubCalendar is available
    if (typeof GitHubCalendar !== 'function') {
      console.warn('GitHubActivity: GitHubCalendar library not loaded');
      const container = document.getElementById('github-calendar');
      if (container) {
        container.innerHTML = '<p>GitHub Calendar library not available</p>';
      }
      return;
    }

    try {
      // Initialize the GitHub calendar with responsive design and tooltips
      GitHubCalendar("#github-calendar", this.username, {
        responsive: true,
        tooltips: true,
        cache: 21600, // Cache for 6 hours (same as our cache manager)
        summary_text: `Summary of pull requests, issues opened, and commits made by ${this.username}`
      }).catch(error => {
        console.error('Failed to load GitHub calendar:', error);
        const container = document.getElementById('github-calendar');
        if (container) {
          container.innerHTML = '<p>Unable to load GitHub contributions calendar</p>';
        }
      });
    } catch (error) {
      console.error('Error initializing GitHub calendar:', error);
      const container = document.getElementById('github-calendar');
      if (container) {
        container.innerHTML = '<p>Error loading GitHub contributions calendar</p>';
      }
    }
  }

  /**
   * Render a basic skeleton while data is loading.  This prevents layout
   * shift and gives users feedback that content is on its way.
   */
  renderSkeleton() {
    this.container.innerHTML = `
      <div class="activity__stats">
        <h3>Loading contributions…</h3>
        <div class="stats__cards">
          <div class="stats__card skeleton-card"></div>
          <div class="stats__card skeleton-card"></div>
          <div class="stats__card skeleton-card"></div>
        </div>
      </div>
      <div class="activity__year-toggle skeleton-buttons">
        ${this.availableYears.map(() => '<button class="year__button" disabled>----</button>').join('')}
      </div>
      <div class="activity__languages">
        <h4>Top Languages</h4>
        <div class="languages__chart-wrapper">
          <div class="skeleton-chart"></div>
          <ul class="languages__legend skeleton-legend"></ul>
        </div>
      </div>
      <div class="activity__heatmap skeleton-heatmap"></div>
    `;
  }
}

export default GitHubActivity;