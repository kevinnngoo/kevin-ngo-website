/**
 * GitHub Charts - Custom SVG-based charts for GitHub activity
 * No external dependencies, pure SVG and JavaScript
 */

window.GitHubCharts = (function() {
  'use strict';

  /**
   * Donut Chart for programming languages
   */
  class DonutChart {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      this.data = options.data || [];
      this.width = options.width || 200;
      this.height = options.height || 200;
      this.innerRadius = options.innerRadius || 60;
      this.outerRadius = options.outerRadius || 90;
      
      if (!this.container) {
        console.error(`Container with id "${containerId}" not found`);
        return;
      }

      this.render();
    }

    render() {
      if (!this.data.length) {
        this.container.innerHTML = '<p class="chart-empty">No language data available</p>';
        return;
      }

      const centerX = this.width / 2;
      const centerY = this.height / 2;
      let currentAngle = -90; // Start from top

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', this.width);
      svg.setAttribute('height', this.height);
      svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `Programming languages distribution: ${this.data.map(d => `${d.name} ${d.percentage.toFixed(1)}%`).join(', ')}`);

      // Create segments
      this.data.forEach((item, index) => {
        const angle = (item.percentage / 100) * 360;
        const path = this.createArcPath(centerX, centerY, this.innerRadius, this.outerRadius, currentAngle, currentAngle + angle);
        
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('fill', item.color);
        pathElement.setAttribute('stroke', '#fff');
        pathElement.setAttribute('stroke-width', '2');
        pathElement.setAttribute('class', 'chart-segment');
        pathElement.setAttribute('data-language', item.name);
        pathElement.setAttribute('data-percentage', item.percentage.toFixed(1));
        
        // Add hover effects
        pathElement.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
        pathElement.addEventListener('mouseleave', () => this.hideTooltip());
        
        svg.appendChild(pathElement);
        currentAngle += angle;
      });

      // Add center text
      const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      centerText.setAttribute('x', centerX);
      centerText.setAttribute('y', centerY - 5);
      centerText.setAttribute('text-anchor', 'middle');
      centerText.setAttribute('class', 'chart-center-text');
      centerText.textContent = 'Languages';
      
      const centerSubtext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      centerSubtext.setAttribute('x', centerX);
      centerSubtext.setAttribute('y', centerY + 15);
      centerSubtext.setAttribute('text-anchor', 'middle');
      centerSubtext.setAttribute('class', 'chart-center-subtext');
      centerSubtext.textContent = `${this.data.length} total`;

      svg.appendChild(centerText);
      svg.appendChild(centerSubtext);

      // Create legend
      const legend = this.createLegend();
      
      this.container.innerHTML = '';
      this.container.appendChild(svg);
      this.container.appendChild(legend);
    }

    createArcPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle) {
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + outerRadius * Math.cos(startAngleRad);
      const y1 = centerY + outerRadius * Math.sin(startAngleRad);
      const x2 = centerX + outerRadius * Math.cos(endAngleRad);
      const y2 = centerY + outerRadius * Math.sin(endAngleRad);

      const x3 = centerX + innerRadius * Math.cos(endAngleRad);
      const y3 = centerY + innerRadius * Math.sin(endAngleRad);
      const x4 = centerX + innerRadius * Math.cos(startAngleRad);
      const y4 = centerY + innerRadius * Math.sin(startAngleRad);

      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

      return [
        'M', x1, y1,
        'A', outerRadius, outerRadius, 0, largeArcFlag, 1, x2, y2,
        'L', x3, y3,
        'A', innerRadius, innerRadius, 0, largeArcFlag, 0, x4, y4,
        'Z'
      ].join(' ');
    }

    createLegend() {
      const legend = document.createElement('div');
      legend.className = 'chart-legend';
      
      this.data.slice(0, 5).forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
          <span class="legend-color" style="background-color: ${item.color}"></span>
          <span class="legend-label">${item.name}</span>
          <span class="legend-percentage">${item.percentage.toFixed(1)}%</span>
        `;
        legend.appendChild(legendItem);
      });

      return legend;
    }

    showTooltip(event, item) {
      // Simple tooltip implementation
      const tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      tooltip.innerHTML = `
        <strong>${item.name}</strong><br>
        ${item.percentage.toFixed(1)}%
      `;
      
      document.body.appendChild(tooltip);
      
      const rect = event.target.getBoundingClientRect();
      tooltip.style.left = rect.left + rect.width / 2 + 'px';
      tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    }

    hideTooltip() {
      const tooltip = document.querySelector('.chart-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    }
  }

  /**
   * Contribution Heatmap for GitHub activity
   */
  class ContributionHeatmap {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      this.data = options.data || [];
      this.selectedYear = options.year || new Date().getFullYear();
      this.width = options.width || 600; // Smaller width
      this.height = options.height || 100; // Smaller height
      this.cellSize = 8; // Smaller cells
      this.cellGap = 1; // Smaller gap
      
      if (!this.container) {
        console.error(`Container with id "${containerId}" not found`);
        return;
      }

      this.processData();
      this.render();
      this.setupYearToggle();
    }

    processData() {
      // Calculate max contributions for color scaling
      this.maxContributions = Math.max(...this.data.map(d => d.count));
      
      // Data is already flattened from the API, but we need to group it back into weeks
      // GitHub weeks start on Sunday, so we need to group by actual weeks
      this.weeks = [];
      
      // Group by weeks based on the date
      let currentWeek = [];
      this.data.forEach((day, index) => {
        currentWeek.push(day);
        
        // If we have 7 days or it's the last day, complete the week
        if (currentWeek.length === 7 || index === this.data.length - 1) {
          this.weeks.push([...currentWeek]);
          currentWeek = [];
        }
      });
    }

    render() {
      if (!this.data.length) {
        this.container.innerHTML = '<p class="chart-empty">No contribution data available</p>';
        return;
      }

      // Clear container
      this.container.innerHTML = '';

      // Create compact heatmap grid
      const heatmapGrid = document.createElement('div');
      heatmapGrid.className = 'heatmap-grid';
      
      // Filter data for selected year
      const yearData = this.getYearData(this.selectedYear);
      
      // Create grid of contribution squares
      yearData.forEach((day, index) => {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.setAttribute('data-date', day.date);
        cell.setAttribute('data-count', day.count);
        cell.setAttribute('title', `${day.count} contributions on ${this.formatDate(day.date)}`);
        
        // Set color intensity based on contribution count
        const intensity = this.getIntensity(day.count);
        cell.setAttribute('data-level', intensity);
        
        heatmapGrid.appendChild(cell);
      });

      this.container.appendChild(heatmapGrid);
    }

    getYearData(year) {
      // Generate 365 days for the selected year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      const yearData = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        const existingData = this.data.find(item => item.date === dateString);
        
        yearData.push({
          date: dateString,
          count: existingData ? existingData.count : 0,
          weekday: d.getDay()
        });
      }
      
      return yearData;
    }

    getIntensity(count) {
      if (count === 0) return 0;
      if (count <= 2) return 1;
      if (count <= 5) return 2;
      if (count <= 10) return 3;
      return 4;
    }

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }

    setupYearToggle() {
      // Find year buttons and add event listeners
      const yearButtons = document.querySelectorAll('.year__button');
      yearButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          // Remove active class from all buttons
          yearButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          e.target.classList.add('active');
          
          // Update selected year and re-render
          this.selectedYear = parseInt(e.target.dataset.year);
          this.render();
        });
      });
    }

  }

    hideTooltip() {
      const tooltip = document.querySelector('.chart-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    }
  }

  // Public API
  return {
    DonutChart,
    ContributionHeatmap
  };
})();
