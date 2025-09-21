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
      this.width = options.width || 800;
      this.height = options.height || 120;
      this.cellSize = 12;
      this.cellGap = 2;
      
      if (!this.container) {
        console.error(`Container with id "${containerId}" not found`);
        return;
      }

      this.processData();
      this.render();
    }

    processData() {
      // Group data by weeks and calculate max contributions for color scaling
      this.maxContributions = Math.max(...this.data.map(d => d.count));
      this.weeks = [];
      
      // Group by weeks (7 days each)
      for (let i = 0; i < this.data.length; i += 7) {
        this.weeks.push(this.data.slice(i, i + 7));
      }
    }

    render() {
      if (!this.data.length) {
        this.container.innerHTML = '<p class="chart-empty">No contribution data available</p>';
        return;
      }

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', this.width);
      svg.setAttribute('height', this.height);
      svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'GitHub contribution activity heatmap for the past year');

      // Add month labels
      this.addMonthLabels(svg);
      
      // Add day labels
      this.addDayLabels(svg);

      // Add contribution squares
      this.weeks.forEach((week, weekIndex) => {
        week.forEach((day, dayIndex) => {
          const x = 30 + weekIndex * (this.cellSize + this.cellGap);
          const y = 20 + dayIndex * (this.cellSize + this.cellGap);
          
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', x);
          rect.setAttribute('y', y);
          rect.setAttribute('width', this.cellSize);
          rect.setAttribute('height', this.cellSize);
          rect.setAttribute('rx', 2);
          rect.setAttribute('fill', this.getContributionColor(day.count));
          rect.setAttribute('class', 'contribution-day');
          rect.setAttribute('data-date', day.date);
          rect.setAttribute('data-count', day.count);
          rect.setAttribute('aria-label', `${day.date}, ${day.count} contribution${day.count !== 1 ? 's' : ''}`);
          
          // Add hover effects
          rect.addEventListener('mouseenter', (e) => this.showTooltip(e, day));
          rect.addEventListener('mouseleave', () => this.hideTooltip());
          
          svg.appendChild(rect);
        });
      });

      // Add legend
      this.addLegend(svg);

      this.container.innerHTML = '';
      this.container.appendChild(svg);
    }

    addMonthLabels(svg) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const weeksPerMonth = 4.33; // Approximate
      
      months.forEach((month, index) => {
        const x = 30 + (index * weeksPerMonth * (this.cellSize + this.cellGap));
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', 15);
        text.setAttribute('class', 'heatmap-month-label');
        text.textContent = month;
        
        svg.appendChild(text);
      });
    }

    addDayLabels(svg) {
      const days = ['Mon', 'Wed', 'Fri'];
      const dayIndices = [0, 2, 4]; // Monday, Wednesday, Friday
      
      dayIndices.forEach((dayIndex, index) => {
        const y = 20 + dayIndex * (this.cellSize + this.cellGap) + this.cellSize / 2;
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', 25);
        text.setAttribute('y', y + 4);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('class', 'heatmap-day-label');
        text.textContent = days[index];
        
        svg.appendChild(text);
      });
    }

    addLegend(svg) {
      const legendX = this.width - 150;
      const legendY = this.height - 20;
      
      // "Less" label
      const lessText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lessText.setAttribute('x', legendX);
      lessText.setAttribute('y', legendY);
      lessText.setAttribute('class', 'heatmap-legend-label');
      lessText.textContent = 'Less';
      svg.appendChild(lessText);
      
      // Color squares
      const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
      colors.forEach((color, index) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', legendX + 30 + index * 14);
        rect.setAttribute('y', legendY - 10);
        rect.setAttribute('width', 10);
        rect.setAttribute('height', 10);
        rect.setAttribute('rx', 2);
        rect.setAttribute('fill', color);
        svg.appendChild(rect);
      });
      
      // "More" label
      const moreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      moreText.setAttribute('x', legendX + 100);
      moreText.setAttribute('y', legendY);
      moreText.setAttribute('class', 'heatmap-legend-label');
      moreText.textContent = 'More';
      svg.appendChild(moreText);
    }

    getContributionColor(count) {
      if (count === 0) return '#ebedf0';
      
      const intensity = Math.min(count / Math.max(this.maxContributions, 1), 1);
      
      if (intensity <= 0.25) return '#9be9a8';
      if (intensity <= 0.5) return '#40c463';
      if (intensity <= 0.75) return '#30a14e';
      return '#216e39';
    }

    showTooltip(event, day) {
      const tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      
      const date = new Date(day.date);
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      tooltip.innerHTML = `
        <strong>${formattedDate}</strong><br>
        ${day.count} contribution${day.count !== 1 ? 's' : ''}
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

  // Public API
  return {
    DonutChart,
    ContributionHeatmap
  };
})();

