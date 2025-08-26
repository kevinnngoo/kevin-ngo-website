// Kevin Ngo Portfolio Script
// Handles mobile navigation toggling, dynamic project loading from GitHub and
// contact form submission via mailto link. All external calls are made from
// client‑side JavaScript.

function getProjectIconSVG(repoName) {
  const name = (repoName || "").toLowerCase();

  // Microblog (Flask app): chat bubbles
  if (name.includes("microblog")) {
    return `
      <svg viewBox="0 0 24 24" role="img" aria-label="Chat icon" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 5h16a2 2 0 012 2v6a2 2 0 01-2 2H9l-5 4V7a2 2 0 012-2z"/>
        <path d="M8 10h8M8 13h5"/>
      </svg>
    `;
  }

  // Stock Market Predictor: line chart
  if (name.includes("stock") || name.includes("predictor")) {
    return `
      <svg viewBox="0 0 24 24" role="img" aria-label="Chart icon" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3v18h18"/>
        <path d="M6 15l4-4 3 3 5-6"/>
        <circle cx="10" cy="11" r="0.8" fill="currentColor"/>
        <circle cx="13" cy="14" r="0.8" fill="currentColor"/>
        <circle cx="18" cy="8" r="0.8" fill="currentColor"/>
      </svg>
    `;
  }

  // Fake News Detector: shield/check
  if (name.includes("fake") || name.includes("news")) {
    return `
      <svg viewBox="0 0 24 24" role="img" aria-label="Shield icon" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3l7 3v6c0 5-3.5 7.8-7 9-3.5-1.2-7-4-7-9V6l7-3z"/>
        <path d="M8.5 12.5l2.5 2.5 4.5-4.5"/>
      </svg>
    `;
  }

  // Apartment Hunting Bot: home + search/gear hints
  if (name.includes("apartment") || name.includes("housing") || name.includes("rent")) {
    return `
      <svg viewBox="0 0 24 24" role="img" aria-label="Home icon" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z"/>
        <path d="M16.5 8.5l1 1M14 9l.5 1.5M19 9l-.5 1.5M16.5 12.5l1-1"/>
      </svg>
    `;
  }

  // Conway's Game of Life: grid + filled cell
  if (name.includes("conway") || name.includes("life")) {
    return `
      <svg viewBox="0 0 24 24" role="img" aria-label="Grid icon" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3h18v18H3z"/>
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
        <rect x="9" y="9" width="6" height="6" fill="currentColor"/>
      </svg>
    `;
  }

  // Default: code / chevrons
  return `
    <svg viewBox="0 0 24 24" role="img" aria-label="Code icon" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 16l-4-4 4-4M16 8l4 4-4 4M10 20l4-16"/>
    </svg>
  `;
}




document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const openMenuBtn = document.getElementById('openMenu');
  const closeMenuBtn = document.getElementById('closeMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  if (openMenuBtn && closeMenuBtn && mobileMenu) {
    openMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.add('open');
    });
    closeMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
    });
    // Also close menu on outside click
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) {
        mobileMenu.classList.remove('open');
      }
    });
  }

  // Fetch and display projects
  const projectsGrid = document.getElementById('projectsGrid');
  if (projectsGrid) {
    // Define a fallback list of projects based on your résumé. This list will be
    // used if live data from GitHub cannot be retrieved (e.g. when viewing the
    // file locally or if the API request fails). Feel free to add or update
    // entries as you publish more repositories.
    const fallbackProjects = [
      {
        title: 'Fake News Detector',
        description: 'Machine learning project that classifies news articles as REAL or FAKE using natural language processing and a PassiveAggressiveClassifier.',
        language: 'Python',
        stars: 0,
        url: 'https://github.com/kevinnngoo/ai_fake_news_detector',
        tech: ['Python', 'scikit-learn', 'NLP'],
        demo: ''
      },
      {
        title: 'Apartment Hunting Bot',
        description: 'Python bot that scrapes Boston apartment listings, filters by rent and number of bedrooms, and sends daily email alerts with matching results.',
        language: 'Python',
        stars: 0,
        url: 'https://github.com/kevinnngoo/apartment_hunting_bot',
        tech: ['Python', 'BeautifulSoup', 'Email'],
        demo: ''
      },
      {
        title: 'Expense Tracker Application',
        description: 'Full‑stack web application built with the MERN stack for tracking, categorizing and visualizing personal expenses in real time.',
        language: 'JavaScript',
        stars: 0,
        url: 'https://github.com/kevinnngoo',
        tech: ['MongoDB', 'Express', 'React', 'Node.js'],
        demo: ''
      },
      {
        title: "Conway's Game of Life",
        description: "A terminal-based implementation of Conway’s Game of Life written in Python. This project simulates the evolution of cellular patterns using simple rules, random starting states, and an animated display in the terminal. Built as a beginner-friendly project to practice loops, conditionals, and 2D list manipulation for hands-on learning.",
        language: 'Python',
        stars: 0,
        url: 'https://github.com/kevinnngoo/conways_game_of_life',
        tech: ['Python', 'Terminal'],
        demo: ''
      },
      {
        title: 'Microblog',
    description: 'Full‑featured Flask microblog platform featuring user authentication, profiles, following system, blogging, private messaging, search, translation, notifications, background jobs, REST API and internationalization. Built with Flask, SQLAlchemy, Bootstrap and more.',
        language: 'Python',
        stars: 0,
        url: 'https://github.com/kevinnngoo/microblog',
        tech: ['Python', 'Flask', 'SQLAlchemy', 'Bootstrap'],
        demo: 'https://microblog-demo.netlify.app'
      },
      {
        title: 'Stock Market Predictor',
        description: 'Machine learning model that predicts stock market trends using historical price data and technical indicators.',
        language: 'Python',
        stars: 0,
        url: 'https://github.com/kevinnngoo/stock-market-predictor',
        tech: ['Python', 'scikit-learn', 'Pandas', 'Matplotlib'],
        demo: ''
      }
    ];

    // Helper to render a list of project objects to the DOM
    function renderProjects(list) {
      projectsGrid.innerHTML = '';
      list.forEach((proj) => {
        const card = document.createElement('div');
        card.className = 'project-card';

        const iconSVG = getProjectIconSVG(proj.title || proj.name);

        const language = proj.language ? ` • ${proj.language}` : '';
        const stars = typeof proj.stars === 'number' ? proj.stars : 0;

        // Tech badges
        let techBadges = '';
        if (proj.tech && proj.tech.length) {
          techBadges = `<div class="tech-list">${proj.tech.map(t => `<span>${t}</span>`).join('')}</div>`;
        }

        // Live demo button
        let demoBtn = '';
        if (proj.demo && proj.demo.startsWith('http')) {
          demoBtn = `<a href="${proj.demo}" class="project-link" target="_blank" rel="noopener" style="margin-right:1rem;">Live Demo</a>`;
        }

        card.innerHTML = `
          <div class="project-card__icon project-card__icon--badge">
            ${iconSVG}
          </div>
          <h3>${proj.title}</h3>
          <p>${proj.description}</p>
          ${techBadges}
          <div class="project-meta">${stars} ★${language}</div>
          <div style="display:flex;gap:0.5rem;">
            ${demoBtn}
            <a href="${proj.url}" class="project-link" target="_blank" rel="noopener">View on GitHub</a>
          </div>
        `;

        projectsGrid.appendChild(card);
      });
    }

    // Attempt to fetch real repositories from GitHub. This will work when
    // running on a domain (e.g. GitHub Pages) where cross‑origin requests to
    // api.github.com are permitted. If the fetch fails, the fallback list is
    // rendered.
    fetch('https://api.github.com/users/kevinnngoo/repos?per_page=100')
      .then((response) => response.json())
      .then((repos) => {
        if (Array.isArray(repos)) {
          /*
           * Build a list of repositories to display. Exclude forked
           * repositories and automation helpers the user doesn’t want shown.
           * Always include the microblog project (if it exists), then add
           * the next three highest‑starred repositories. If there are
           * fewer than four results after filtering, the remainder will be
           * filled from the fallback list defined above.
           */
          const filtered = repos.filter((repo) => {
            if (repo.fork) return false;
            const name = repo.name.toLowerCase();
            // Skip automation helper repos like back‑end automation
            if (name.includes('back') && name.includes('automation')) return false;
            return true;
          });
          // Find microblog if present
          // Always include microblog and the stock market predictor if they exist
          const microblogRepo = filtered.find((repo) => repo.name.toLowerCase() === 'microblog');
          const stockRepo = filtered.find((repo) => repo.name.toLowerCase().includes('stock'));
          // Sort the remaining repositories by star count, excluding microblog and stock
          const sorted = filtered
            .filter(
              (repo) =>
                repo.name.toLowerCase() !== 'microblog' &&
                !repo.name.toLowerCase().includes('stock')
            )
            .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
          // Select up to three top repos (so microblog + stock + 3 = 5 total)
          const topRepos = sorted.slice(0, 3);
          // Compose final list starting with microblog then stock
          const finalList = [];
          if (microblogRepo) finalList.push(microblogRepo);
          if (stockRepo) finalList.push(stockRepo);
          finalList.push(...topRepos);
          // Map to card objects with image selection
          const selected = finalList.map((repo) => {
            let image = '';
            const name = repo.name.toLowerCase();
            if (name.includes('fake')) image = './images/projects/fake_news.png';
            else if (name.includes('apartment')) image = './images/projects/apartment_bot.png';
            else if (name.includes('conway')) image = './images/projects/game_of_life.png';
            else if (name.includes('microblog')) image = './images/projects/microblog.png';
            else if (name.includes('stock')) image = './images/projects/stock_market_predictor.png';
            else image = './images/projects/expense_tracker.png';
            // Always use custom description for Microblog and Conway's Game of Life
            let description = repo.description || '';
            if (name.includes('microblog')) {
              description =
                'Full‑featured Flask microblog platform featuring user authentication, profiles, following system, blogging, private messaging, search, translation, notifications, background jobs, REST API and internationalization. Built with Flask, SQLAlchemy, Bootstrap and more.';
            }
            if (name.includes('conway')) {
              description =
                "A terminal-based implementation of Conway’s Game of Life written in Python. This project simulates the evolution of cellular patterns using simple rules, random starting states, and an animated display in the terminal. Built as a beginner-friendly project to practice loops, conditionals, and 2D list manipulation for hands-on learning.";
            }
            if (!description && name.includes('stock')) {
              description =
                'Machine learning model that predicts stock market trends using historical price data and technical indicators.';
            }
            if (!description && name.includes('fake')) {
              description =
                'Machine learning project that classifies news articles as REAL or FAKE using natural language processing and a PassiveAggressiveClassifier.';
            }
            if (!description && name.includes('apartment')) {
              description =
                'Python bot that scrapes Boston apartment listings, filters by rent and number of bedrooms, and sends daily email alerts with matching results.';
            }
            // Format the repository name into title case for display
            const formattedTitle = repo.name
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
            return {
  title: formattedTitle,
  description: description || 'No description provided.',
  language: repo.language || '',
  stars: repo.stargazers_count || 0,
  url: repo.html_url
};
          });
          // If there are fewer than five entries, fill from fallbackProjects
          if (selected.length < 5) {
            const namesInSelected = selected.map((p) => p.title.toLowerCase());
            fallbackProjects.forEach((proj) => {
              if (selected.length >= 5) return;
              if (!namesInSelected.includes(proj.title.toLowerCase())) {
                selected.push(proj);
              }
            });
          }
          renderProjects(selected);
        } else {
          renderProjects(fallbackProjects);
        }
      })
      .catch(() => {
        // If any error occurs (CORS, network, etc.), render fallback projects
        renderProjects(fallbackProjects);
      });
  }

  // Contact form submission
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const message = document.getElementById('message').value.trim();
      if (!name || !email || !message) {
        if (formStatus) {
          formStatus.style.color = getComputedStyle(document.documentElement).getPropertyValue('--error-color');
          formStatus.textContent = 'Please fill out all fields.';
        }
        return;
      }
      // Build mailto link
      const subject = encodeURIComponent('Portfolio Contact Form');
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\n${message}`
      );
      const mailtoLink = `mailto:kevinngo2002@gmail.com?subject=${subject}&body=${body}`;
      // Open mail client
      window.location.href = mailtoLink;
      if (formStatus) {
        formStatus.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        formStatus.textContent = 'Thank you! Your email client should open shortly.';
      }
      // Reset form after a short delay
      setTimeout(() => {
        contactForm.reset();
        if (formStatus) formStatus.textContent = '';
      }, 3000);
    });
  }

  // Set current year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});