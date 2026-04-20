/* ============================================
   Theme Management
   ============================================ */
const ThemeManager = (() => {
  const KEY = 'theme-preference';

  function get() {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function set(scheme) {
    document.documentElement.style.colorScheme = scheme;
    localStorage.setItem(KEY, scheme);
    window.dispatchEvent(new Event('themechange'));
  }

  function toggle() {
    set(get() === 'light' ? 'dark' : 'light');
  }

  function isDark() {
    return get() === 'dark';
  }

  // Apply saved theme immediately
  document.documentElement.style.colorScheme = get();

  return { get, set, toggle, isDark };
})();

/* ============================================
   GSAP & ScrollTrigger Setup
   ============================================ */
gsap.registerPlugin(ScrollTrigger);

/* ============================================
   Hero Particle Grid — Repulse + Grab
   ============================================ */
(function () {
  const hero = document.getElementById('hero');
  const canvas = document.getElementById('heroParticles');
  const ctx = canvas.getContext('2d');

  let W, H, dots;
  let mouse = { x: -9999, y: -9999 };
  let isDragging = false;

  const COLS_BASE = 40;
  const RADIUS = 140;
  const REPULSE_STRENGTH = 6;
  const GRAB_STRENGTH = 4;
  const SPRING = 0.055;
  const DAMPING = 0.88;
  const DOT_SIZE = 3;

  function resize() {
    W = hero.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;
    initDots();
  }

  function initDots() {
    dots = [];
    const spacing = W / (COLS_BASE + 1);
    const rows = Math.floor(H / spacing);
    const offsetX = spacing;
    const offsetY = (H - (rows - 1) * spacing) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS_BASE; c++) {
        const ox = offsetX + c * spacing;
        const oy = offsetY + r * spacing;
        dots.push({ x: ox, y: oy, ox, oy, vx: 0, vy: 0 });
      }
    }
  }

  function getColor(dist) {
    const t = Math.max(0, 1 - dist / RADIUS);
    const dark = ThemeManager.isDark();
    if (isDragging) {
      if (dark) {
        const r = Math.round(82 + t * 67);
        const g = Math.round(183 + t * 30);
        const b = Math.round(136 - t * 10);
        return `rgba(${r},${g},${b},${0.35 + t * 0.55})`;
      }
      const r = Math.round(40 + t * 42);
      const g = Math.round(145 + t * 38);
      const b = Math.round(108 - t * 30);
      return `rgba(${r},${g},${b},${0.35 + t * 0.55})`;
    }
    if (dark) {
      const r = Math.round(82 + t * 67);
      const g = Math.round(183 + t * 30);
      const b = Math.round(136 + t * 40);
      return `rgba(${r},${g},${b},${0.3 + t * 0.6})`;
    }
    const r = Math.round(45 + t * 37);
    const g = Math.round(106 + t * 77);
    const b = Math.round(79 + t * 57);
    return `rgba(${r},${g},${b},${0.3 + t * 0.6})`;
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (const p of dots) {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < RADIUS && dist > 0.5) {
        const norm = dist / RADIUS;
        const force = (1 - norm) * (1 - norm);

        if (!isDragging) {
          p.vx -= (dx / dist) * force * REPULSE_STRENGTH;
          p.vy -= (dy / dist) * force * REPULSE_STRENGTH;
        } else {
          p.vx += (dx / dist) * force * GRAB_STRENGTH;
          p.vy += (dy / dist) * force * GRAB_STRENGTH;
        }
      }

      p.vx += (p.ox - p.x) * SPRING;
      p.vy += (p.oy - p.y) * SPRING;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      const inRange = dist < RADIUS;
      ctx.beginPath();
      ctx.arc(p.x, p.y, DOT_SIZE, 0, Math.PI * 2);
      ctx.fillStyle = inRange ? getColor(dist) : (ThemeManager.isDark() ? 'rgba(82,183,136,0.15)' : 'rgba(45,106,79,0.15)');
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  hero.addEventListener('mousemove', e => { const p = getPos(e); mouse.x = p.x; mouse.y = p.y; });
  hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; isDragging = false; });
  hero.addEventListener('mousedown', () => { isDragging = true; });
  hero.addEventListener('mouseup', () => { isDragging = false; });

  hero.addEventListener('touchmove', e => { const p = getPos(e); mouse.x = p.x; mouse.y = p.y; }, { passive: true });
  hero.addEventListener('touchstart', e => { isDragging = true; const p = getPos(e); mouse.x = p.x; mouse.y = p.y; });
  hero.addEventListener('touchend', () => { isDragging = false; mouse.x = -9999; mouse.y = -9999; });

  window.addEventListener('resize', resize);
  resize();
  tick();
})();

/* ============================================
   Scroll Progress Bar
   ============================================ */
const progressBar = document.createElement('div');
progressBar.id = 'scrollProgress';

function getProgressGradient() {
  return ThemeManager.isDark()
    ? 'linear-gradient(90deg, #52b788, #95d5b2, #6ecf9a)'
    : 'linear-gradient(90deg, #2d6a4f, #52b788, #40916c)';
}

progressBar.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: ${getProgressGradient()};
  z-index: 9999;
  transform-origin: left;
  transform: scaleX(0);
  transition: none;
`;
document.body.prepend(progressBar);

window.addEventListener('themechange', () => {
  progressBar.style.background = getProgressGradient();
});

gsap.to(progressBar, {
  scaleX: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
  },
});

/* ============================================
   Preloader Animation
   ============================================ */
const preloaderTl = gsap.timeline({
  onComplete: () => {
    initPageAnimations();
  }
});

// Preloader sequence
preloaderTl
  .to('.preloader-line', {
    scaleX: 1,
    duration: 0.6,
    ease: 'power2.out'
  })
  .to('.preloader-letter', {
    opacity: 1,
    y: 0,
    duration: 0.5,
    stagger: 0.08,
    ease: 'back.out(1.7)'
  }, '-=0.2')
  .to('#preloaderCounter', {
    opacity: 1,
    duration: 0.3,
  }, '-=0.3')
  .to({ val: 0 }, {
    val: 100,
    duration: 1.2,
    ease: 'power1.inOut',
    onUpdate: function () {
      document.getElementById('preloaderCounter').textContent = Math.round(this.targets()[0].val);
    }
  }, '-=0.2')
  .to('.preloader-letter', {
    opacity: 0,
    y: -30,
    duration: 0.3,
    stagger: 0.04,
    ease: 'power2.in'
  })
  .to('.preloader-line, #preloaderCounter', {
    opacity: 0,
    duration: 0.2,
  }, '-=0.2')
  .to('.preloader', {
    yPercent: -100,
    duration: 0.8,
    ease: 'power3.inOut'
  }, '-=0.1')
  .set('.preloader', { display: 'none' });

/* ============================================
   Page Entrance Animations
   ============================================ */
function initPageAnimations() {
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  heroTl
    .to('#nav', { opacity: 1, duration: 0.6 })
    .to('.hero-tag-line', { scaleX: 1, duration: 0.5, transformOrigin: 'left' }, '-=0.3')
    .to('.hero-tag-text', { opacity: 1, x: 0, duration: 0.5 }, '-=0.2')
    .to('.hero-title-word', {
      y: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power4.out'
    }, '-=0.3')
    .to('.hero-description', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .to('.hero-cta', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .to('.hero-scroll', { opacity: 1, duration: 0.5 }, '-=0.3');

  initScrollAnimations();
}

/* ============================================
   Scroll-Triggered Animations
   ============================================ */
function initScrollAnimations() {
  // Section headers
  document.querySelectorAll('.section-header').forEach(header => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: header,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      }
    });

    tl.to(header.querySelector('.section-index'), {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out'
    })
    .to(header.querySelectorAll('.section-title-word'), {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out'
    }, '-=0.3')
    .to(header.querySelector('.section-line'), {
      scaleX: 1,
      duration: 0.6,
      ease: 'power2.out'
    }, '-=0.3');
  });

  // About paragraphs
  document.querySelectorAll('.reveal-text').forEach(text => {
    gsap.to(text, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: text,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      }
    });
  });

  // Stat cards — CSS counter animation via @property
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    gsap.to(card, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      delay: i * 0.15,
      ease: 'back.out(1.2)',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
        onEnter: () => card.querySelector('.stat-number').classList.add('counting'),
        onLeaveBack: () => card.querySelector('.stat-number').classList.remove('counting'),
      },
    });
  });

  // Skill categories
  document.querySelectorAll('.skill-category').forEach((cat, i) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: cat,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      }
    });

    tl.to(cat, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      delay: i * 0.1,
      ease: 'power2.out'
    })
    .to(cat.querySelectorAll('.skill-tag'), {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.4,
      stagger: 0.05,
      ease: 'back.out(1.5)'
    }, '-=0.2');
  });

  // Timeline line
  gsap.to('.timeline-line', {
    scaleY: 1,
    duration: 1.5,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.experience-timeline',
      start: 'top 80%',
      toggleActions: 'play none none reverse',
    }
  });

  // Experience items
  document.querySelectorAll('.experience-item').forEach(item => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      }
    });

    tl.to(item, {
      opacity: 1,
      x: 0,
      duration: 0.7,
      ease: 'power3.out'
    })
    .to(item.querySelector('.experience-dot'), {
      scale: 1,
      duration: 0.4,
      ease: 'back.out(2)'
    }, '-=0.3');
  });

  // Highlight cards
  document.querySelectorAll('.highlight-card').forEach((card, i) => {
    gsap.to(card, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      delay: i * 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      }
    });
  });

  // Contact links
  document.querySelectorAll('.contact-link').forEach((link, i) => {
    gsap.to(link, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      delay: i * 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: link,
        start: 'top 90%',
        toggleActions: 'play none none reverse',
      }
    });
  });

  // Contact CTA
  gsap.to('.contact-cta', {
    opacity: 1,
    y: 0,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.contact-cta',
      start: 'top 90%',
      toggleActions: 'play none none reverse',
    }
  });

  // Hero content fade on scroll
  gsap.to('.hero-content', {
    opacity: 0,
    y: -80,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: '40% top',
      end: '90% top',
      scrub: 0.5,
    }
  });

  // Horizontal scroll-driven skill tags glow
  document.querySelectorAll('.skill-tag').forEach(tag => {
    tag.addEventListener('mouseenter', () => {
      gsap.to(tag, {
        scale: 1.08,
        duration: 0.2,
        ease: 'power2.out'
      });
    });
    tag.addEventListener('mouseleave', () => {
      gsap.to(tag, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    });
  });
}

/* ============================================
   Mobile Menu
   ============================================ */
const hamburger = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
});

document.querySelectorAll('.mobile-menu-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
  });
});

/* ============================================
   Smooth Scroll for Nav Links
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      gsap.to(window, {
        scrollTo: { y: target, offsetY: 80 },
        duration: 1,
        ease: 'power3.inOut'
      });
    }
  });
});

/* ============================================
   Nav Background on Scroll
   ============================================ */
ScrollTrigger.create({
  start: 'top -80',
  onUpdate: (self) => {
    if (self.direction === 1 && self.scroll() > 200) {
      gsap.to('#nav', { y: -100, duration: 0.3, ease: 'power2.in' });
    } else {
      gsap.to('#nav', { y: 0, duration: 0.3, ease: 'power2.out' });
    }
  }
});

/* ============================================
   Theme Toggle Button
   ============================================ */
document.getElementById('themeToggle').addEventListener('click', () => {
  ThemeManager.toggle();
});
