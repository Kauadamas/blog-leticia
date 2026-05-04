/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  ASA ATACADISTA — main.js                                ║
 * ║  Versão  : 1.0.0                                         ║
 * ║  Data    : 2026-02-24                                     ║
 * ║  Módulos :                                               ║
 * ║    - App        → bootstrap e versão                     ║
 * ║    - Header     → sticky scroll, active nav              ║
 * ║    - MobileMenu → hamburger, fechar ao clicar            ║
 * ║    - Reveal     → IntersectionObserver scroll reveal     ║
 * ║    - Counter    → animação de contadores numéricos       ║
 * ║    - Toast      → sistema de notificações                ║
 * ║    - Form       → validação e submit do formulário       ║
 * ║    - Year       → ano dinâmico no footer                 ║
 * ╚══════════════════════════════════════════════════════════╝
 */

'use strict';

/* ─────────────────────────────────────────
   APP — bootstrap
───────────────────────────────────────── */
const App = (() => {
  const VERSION = '1.1.0';
  const SECTIONS = ['inicio', 'sobre', 'localizacao', 'clientes', 'valores', 'contato'];

  function init() {
    console.log(`[ASA Atacadista] v${VERSION} — iniciando`);

    Header.init();
    MobileMenu.init();
    Reveal.init();
    Counter.init();
    Toast.init();
    Year.init();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

  return { VERSION, SECTIONS };
})();


/* ─────────────────────────────────────────
   HEADER — sticky + active link
───────────────────────────────────────── */
const Header = (() => {
  let header, navLinks, sections;
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  function update() {
    ticking = false;
    updateScrolled();
    updateActiveLink();
  }

  function updateScrolled() {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }

  function updateActiveLink() {
    const scrollY = window.scrollY + 120;
    let current = App.SECTIONS[0];

    sections.forEach(sec => {
      if (sec && sec.offsetTop <= scrollY) current = sec.id;
    });

    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      link.classList.toggle('is-active', href === `#${current}`);
    });
  }

  function init() {
    header   = document.getElementById('siteHeader');
    navLinks = Array.from(document.querySelectorAll('.nav-link, .mobile-nav__link'));
    sections = App.SECTIONS.map(id => document.getElementById(id)).filter(Boolean);

    if (!header) return;
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  return { init };
})();


/* ─────────────────────────────────────────
   MOBILE MENU — hamburger + gestos
───────────────────────────────────────── */
const MobileMenu = (() => {
  let btn, menu, isOpen = false;

  function open() {
    isOpen = true;
    btn.classList.add('is-open');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Fechar menu');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    isOpen = false;
    btn.classList.remove('is-open');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Abrir menu');
    document.body.style.overflow = '';
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function init() {
    btn  = document.getElementById('hamburgerBtn');
    menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    btn.addEventListener('click', toggle);

    // Links dentro do menu fecham ao clicar
    menu.querySelectorAll('[data-menu-link]').forEach(link => {
      link.addEventListener('click', close);
    });

    // ESC fecha
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) close();
    });

    // Clique fora fecha
    document.addEventListener('click', e => {
      if (!isOpen) return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) close();
    });

    // Swipe right fecha (touch)
    let startX = 0;
    menu.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    menu.addEventListener('touchend',   e => {
      if (e.changedTouches[0].clientX - startX > 60) close();
    }, { passive: true });
  }

  return { init, open, close };
})();


/* ─────────────────────────────────────────
   REVEAL — IntersectionObserver
───────────────────────────────────────── */
const Reveal = (() => {
  const THRESHOLD = 0.12;
  const ROOT_MARGIN = '0px 0px -8% 0px';

  function init() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = Array.from(document.querySelectorAll('.reveal'));

    if (prefersReduced || !('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = parseInt(entry.target.style.getPropertyValue('--delay'), 10) || 0;
        setTimeout(() => entry.target.classList.add('in-view'), delay);
        observer.unobserve(entry.target);
      });
    }, { threshold: THRESHOLD, rootMargin: ROOT_MARGIN });

    elements.forEach(el => observer.observe(el));
  }

  return { init };
})();


/* ─────────────────────────────────────────
   COUNTER — animação de números
───────────────────────────────────────── */
const Counter = (() => {
  const DURATION = 1800;
  const EASING = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;

    const start = performance.now();

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / DURATION, 1);
      const value    = Math.floor(EASING(progress) * target);
      el.textContent = value;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  function init() {
    const counters = Array.from(document.querySelectorAll('[data-count]'));
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(el => (el.textContent = el.dataset.count));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
  }

  return { init };
})();


/* ─────────────────────────────────────────
   TOAST — sistema de notificações
───────────────────────────────────────── */
const Toast = (() => {
  let toastEl, titleEl, msgEl, iconEl, closeBtn;
  let hideTimer = null;

  const ICONS = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>`,
    error:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>`,
  };

  function show({ type = 'success', title = '', message = '', duration = 4500 } = {}) {
    if (!toastEl) return;

    toastEl.dataset.type = type;
    titleEl.textContent  = title;
    msgEl.textContent    = message;
    iconEl.innerHTML     = ICONS[type] || ICONS.success;

    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('is-visible'));

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, duration);
  }

  function hide() {
    if (!toastEl) return;
    toastEl.classList.remove('is-visible');
    setTimeout(() => { toastEl.hidden = true; }, 300);
  }

  function init() {
    toastEl  = document.getElementById('toast');
    titleEl  = document.getElementById('toastTitle');
    msgEl    = document.getElementById('toastMsg');
    iconEl   = document.getElementById('toastIcon');
    closeBtn = document.getElementById('toastClose');

    if (closeBtn) closeBtn.addEventListener('click', hide);
  }

  return { init, show, hide };
})();


/* ─────────────────────────────────────────
   FORM — validação + submit
───────────────────────────────────────── */
const Form = (() => {
  function validateField(input) {
    const value   = input.value.trim();
    const isValid = input.checkValidity() && value.length > 0;
    input.classList.toggle('is-invalid', !isValid && value.length > 0);
    input.classList.toggle('is-valid',    isValid);
    return isValid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form   = e.target;
    const inputs = Array.from(form.querySelectorAll('[required]'));
    const valid  = inputs.map(validateField).every(Boolean);

    if (!valid) {
      Toast.show({
        type: 'error',
        title: 'Campos obrigatórios',
        message: 'Preencha todos os campos obrigatórios antes de enviar.',
      });
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const origText  = submitBtn.textContent;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Enviando...';

    try {
      /* ── INTEGRAÇÃO REAL: troque a URL e adapte conforme seu backend ── */
      /* const data = new FormData(form);
         const res  = await fetch('/contato.php', { method: 'POST', body: data });
         if (!res.ok) throw new Error(`HTTP ${res.status}`); */

      // Simulação (remover em produção)
      await new Promise(r => setTimeout(r, 1400));

      Toast.show({
        type: 'success',
        title: 'Mensagem enviada!',
        message: 'Recebemos seu contato. Nossa equipe retornará em breve.',
      });
      form.reset();
      form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));

    } catch (err) {
      console.error('[Form] Erro ao enviar:', err);
      Toast.show({
        type: 'error',
        title: 'Erro ao enviar',
        message: 'Ocorreu um problema. Tente novamente ou fale pelo WhatsApp.',
      });
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = origText;
    }
  }

  function init() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', handleSubmit);

    // Validação em tempo real
    form.querySelectorAll('input, textarea').forEach(input => {
      input.addEventListener('blur', () => validateField(input));
    });
  }

  return { init };
})();


/* ─────────────────────────────────────────
   YEAR — ano dinâmico
───────────────────────────────────────── */
const Year = (() => {
  function init() {
    const el = document.getElementById('footerYear');
    if (el) el.textContent = new Date().getFullYear();
  }
  return { init };
})();