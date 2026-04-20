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

  const canInteract = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canInteract || prefersReducedMotion) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');

  let W, H, dots;
  let mouse = { x: -9999, y: -9999 };
  let isDragging = false;
  let isDark = ThemeManager.isDark();
  let rafId = null;
  let running = false;

  const COLS_BASE = 40;
  const RADIUS = 140;
  const RADIUS_SQ = RADIUS * RADIUS;
  const REPULSE_STRENGTH = 6;
  const GRAB_STRENGTH = 4;
  const SPRING = 0.055;
  const DAMPING = 0.88;
  const DOT_SIZE = 3;
  const REST_EPSILON = 0.05;
  const TAU = Math.PI * 2;

  function idleColor() {
    return isDark ? 'rgba(82,183,136,0.15)' : 'rgba(45,106,79,0.15)';
  }

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
    if (isDragging) {
      if (isDark) {
        const r = 82 + ((t * 67) | 0);
        const g = 183 + ((t * 30) | 0);
        const b = 136 - ((t * 10) | 0);
        return `rgba(${r},${g},${b},${0.35 + t * 0.55})`;
      }
      const r = 40 + ((t * 42) | 0);
      const g = 145 + ((t * 38) | 0);
      const b = 108 - ((t * 30) | 0);
      return `rgba(${r},${g},${b},${0.35 + t * 0.55})`;
    }
    if (isDark) {
      const r = 82 + ((t * 67) | 0);
      const g = 183 + ((t * 30) | 0);
      const b = 136 + ((t * 40) | 0);
      return `rgba(${r},${g},${b},${0.3 + t * 0.6})`;
    }
    const r = 45 + ((t * 37) | 0);
    const g = 106 + ((t * 77) | 0);
    const b = 79 + ((t * 57) | 0);
    return `rgba(${r},${g},${b},${0.3 + t * 0.6})`;
  }

  const activeDots = [];

  function tick() {
    if (!running) { rafId = null; return; }
    ctx.clearRect(0, 0, W, H);

    const mx = mouse.x, my = mouse.y;
    const mouseActive = mx > -1000;

    ctx.fillStyle = idleColor();
    ctx.beginPath();
    activeDots.length = 0;

    for (let i = 0; i < dots.length; i++) {
      const p = dots[i];
      let dist = 0;
      let inRange = false;

      if (mouseActive) {
        const dx = mx - p.x;
        const dy = my - p.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < RADIUS_SQ && distSq > 0.25) {
          dist = Math.sqrt(distSq);
          inRange = true;
          const norm = dist / RADIUS;
          const force = (1 - norm) * (1 - norm);
          const sign = isDragging ? 1 : -1;
          const strength = isDragging ? GRAB_STRENGTH : REPULSE_STRENGTH;
          p.vx += sign * (dx / dist) * force * strength;
          p.vy += sign * (dy / dist) * force * strength;
        }
      }

      const sx = p.ox - p.x;
      const sy = p.oy - p.y;
      if (inRange || Math.abs(p.vx) > REST_EPSILON || Math.abs(p.vy) > REST_EPSILON
          || Math.abs(sx) > REST_EPSILON || Math.abs(sy) > REST_EPSILON) {
        p.vx = (p.vx + sx * SPRING) * DAMPING;
        p.vy = (p.vy + sy * SPRING) * DAMPING;
        p.x += p.vx;
        p.y += p.vy;
      }

      if (inRange) {
        activeDots.push(p, dist);
      } else {
        ctx.moveTo(p.x + DOT_SIZE, p.y);
        ctx.arc(p.x, p.y, DOT_SIZE, 0, TAU);
      }
    }
    ctx.fill();

    for (let i = 0; i < activeDots.length; i += 2) {
      const p = activeDots[i];
      ctx.fillStyle = getColor(activeDots[i + 1]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, DOT_SIZE, 0, TAU);
      ctx.fill();
    }

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  hero.addEventListener('mousemove', e => { const p = getPos(e); mouse.x = p.x; mouse.y = p.y; });
  hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; isDragging = false; });
  hero.addEventListener('mousedown', () => { isDragging = true; });
  hero.addEventListener('mouseup', () => { isDragging = false; });

  window.addEventListener('themechange', () => { isDark = ThemeManager.isDark(); });
  window.addEventListener('resize', resize);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) start();
        else stop();
      }
    }).observe(hero);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  start();
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
    .to('.hero-title-word', {
      y: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power4.out'
    }, '-=0.3')
    .to('.hero-tag-line', { scaleX: 1, duration: 0.5, transformOrigin: 'left' }, '-=0.3')
    .to('.hero-tag-text', { opacity: 1, x: 0, duration: 0.5 }, '-=0.2')
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

  // Stat cards — JS-driven number count (works everywhere, incl. mobile Safari)
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    const numEl = card.querySelector('.stat-number');
    const target = parseInt(numEl.dataset.target, 10) || 0;
    const counter = { val: 0 };

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
        onEnter: () => {
          gsap.to(counter, {
            val: target,
            duration: 1.5,
            ease: 'power2.out',
            onUpdate: () => { numEl.textContent = Math.round(counter.val); },
          });
        },
        onLeaveBack: () => {
          gsap.killTweensOf(counter);
          counter.val = 0;
          numEl.textContent = '0';
        },
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
