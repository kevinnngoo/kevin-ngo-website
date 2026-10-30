// Kevin Ngo Portfolio Script
// Handles the mobile navigation, curated project cards, and contact form.

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
  // Sticky header gets a background once the page scrolls
  const header = document.querySelector('.header');
  const updateHeader = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Mobile navigation drawer
  const openMenuBtn = document.getElementById('openMenu');
  const closeMenuBtn = document.getElementById('closeMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  const menuBackdrop = document.getElementById('mobileMenuBackdrop');
  const backgroundElements = [
    document.querySelector('.skip-nav'),
    document.querySelector('.header'),
    document.getElementById('main-content'),
    document.querySelector('.footer')
  ].filter(Boolean);
  if (openMenuBtn && closeMenuBtn && mobileMenu && menuBackdrop) {
    const closeMenu = () => {
      mobileMenu.classList.remove('open');
      menuBackdrop.classList.remove('open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      mobileMenu.setAttribute('inert', '');
      backgroundElements.forEach((element) => element.removeAttribute('inert'));
      openMenuBtn.setAttribute('aria-expanded', 'false');
      openMenuBtn.focus();
    };

    openMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      menuBackdrop.classList.add('open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      mobileMenu.removeAttribute('inert');
      backgroundElements.forEach((element) => element.setAttribute('inert', ''));
      openMenuBtn.setAttribute('aria-expanded', 'true');
      closeMenuBtn.focus();
    });
    closeMenuBtn.addEventListener('click', closeMenu);
    menuBackdrop.addEventListener('click', closeMenu);
    mobileMenu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobileMenu.classList.contains('open')) {
        closeMenu();
        return;
      }

      if (event.key === 'Tab' && mobileMenu.classList.contains('open')) {
        const focusableElements = mobileMenu.querySelectorAll(
          'button:not([disabled]), a[href]'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  // Render a curated project list so project descriptions and ordering stay intentional.
  const projectsGrid = document.getElementById('projectsGrid');
  if (projectsGrid) {
    const projects = [
      {
        title: 'Fake News Detector',
        status: 'Machine learning',
        description:
          'Developed a machine-learning text classification pipeline using over ' +
          '6,000 news articles, TF-IDF feature extraction, and a ' +
          'PassiveAggressiveClassifier, achieving 92.8% accuracy during evaluation.',
        url: 'https://github.com/kevinnngoo/ml-fake-news-detector',
        tech: ['Python', 'scikit-learn', 'pandas', 'TF-IDF'],
        metric: { value: '92.8%', label: 'accuracy during evaluation' }
      },
      {
        title: 'Microblogging Web App',
        status: 'Full-stack web app',
        description:
          'Built a full-stack microblogging application with user ' +
          'authentication, CRUD functionality, pagination, relational database ' +
          'models, and database migrations.',
        url: 'https://github.com/kevinnngoo/microblog',
        tech: ['Python', 'Flask', 'SQLAlchemy', 'Bootstrap']
      },
      {
        title: "Conway's Game of Life",
        status: 'Python practice',
        description:
          'A small terminal simulation of Conway’s Game of Life. I built it ' +
          'to practice Python loops, conditionals, 2D lists, and updating a ' +
          'grid from one generation to the next.',
        url: 'https://github.com/kevinnngoo/conways_game_of_life',
        tech: ['Python', 'Terminal']
      }
    ];

    projects.forEach((project) => {
      const card = document.createElement('article');
      card.className = 'project-card reveal';

      let preview;
      if (project.metric) {
        preview = `<div class="project-card__metric"><strong>${project.metric.value}</strong><span>${project.metric.label}</span></div>`;
      } else if (project.image) {
        preview = `<img src="${project.image}" alt="${project.imageAlt || ''}" loading="lazy" />`;
      } else {
        preview = `<div class="project-card__icon" aria-hidden="true">${getProjectIconSVG(project.title)}</div>`;
      }

      card.innerHTML = `
        <div class="project-card__preview">${preview}</div>
        <div class="project-card__body">
          <p class="project-card__status">${project.status}</p>
          <h3>${project.title}</h3>
          <p>${project.description}</p>
          <ul class="tech-list">
            ${project.tech.map((technology) => `<li>${technology}</li>`).join('')}
          </ul>
          <div class="project-card__links">
            <a
              href="${project.url}"
              class="project-link"
              target="_blank"
              rel="noopener noreferrer"
            >View source<span aria-hidden="true"> →</span></a>
          </div>
        </div>
      `;

      projectsGrid.appendChild(card);
    });
  }

  // Contact form submission with enhanced validation and user experience
  const revealTargets = document.querySelectorAll(
    '.section__title, .about__body, .experience-card, .skill-group, .education__item, .contact__form, .project-card'
  );
  revealTargets.forEach((element) => element.classList.add('reveal'));
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    revealTargets.forEach((element) => observer.observe(element));
  } else {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
  }

  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  if (contactForm) {
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Helper function to show status messages
    function showStatus(message, isError = false) {
      if (formStatus) {
        formStatus.style.color = isError 
          ? getComputedStyle(document.documentElement).getPropertyValue('--error-color')
          : getComputedStyle(document.documentElement).getPropertyValue('--accent-light');
        formStatus.textContent = message;
        formStatus.setAttribute('aria-live', 'polite');
      }
    }
    
    // Clear status messages
    function clearStatus() {
      if (formStatus) {
        formStatus.textContent = '';
        formStatus.removeAttribute('aria-live');
      }
    }
    
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearStatus();
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const message = document.getElementById('message').value.trim();
      
      // Validate individual fields
      if (!name) {
        showStatus('Please enter your name.', true);
        document.getElementById('name').focus();
        return;
      }
      
      if (!email) {
        showStatus('Please enter your email address.', true);
        document.getElementById('email').focus();
        return;
      }
      
      if (!emailRegex.test(email)) {
        showStatus('Please enter a valid email address.', true);
        document.getElementById('email').focus();
        return;
      }
      
      if (!message) {
        showStatus('Please enter your message.', true);
        document.getElementById('message').focus();
        return;
      }
      
      if (message.length < 10) {
        showStatus('Please enter a message with at least 10 characters.', true);
        document.getElementById('message').focus();
        return;
      }
      
      // Build enhanced mailto link
      const subject = encodeURIComponent(`Portfolio Contact: Message from ${name}`);
      const body = encodeURIComponent(
        `Hello Kevin,\n\nI'm reaching out through your portfolio contact form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\nBest regards,\n${name}`
      );
      const mailtoLink = `mailto:kevinngo2002@gmail.com?subject=${subject}&body=${body}`;
      
      // Show loading state
      showStatus('Opening your email client...');
      
      // Open mail client
      try {
        window.location.href = mailtoLink;
        
        // Show success message after a brief delay
        setTimeout(() => {
          showStatus('✓ Email client opened! If it didn\'t open automatically, please email me directly at kevinngo2002@gmail.com');
        }, 1000);
        
        // Reset form after successful submission
        setTimeout(() => {
          contactForm.reset();
          clearStatus();
        }, 8000);
        
      } catch (error) {
        showStatus('Unable to open email client. Please email me directly at kevinngo2002@gmail.com', true);
      }
    });
    
    // Clear error messages when user starts typing
    ['name', 'email', 'message'].forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', clearStatus);
      }
    });
  }

  // Set current year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

});
