(() => {
  // A route without an authored fragment is a reading surface, not a resume
  // target. Prevent browser scroll restoration from reopening long pages at
  // the footer or at a previously captured viewport position. Explicit
  // fragments (including #main) retain their normal anchor semantics.
  if (!window.location.hash) {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const openAtReadingStart = () => window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', openAtReadingStart, {once: true});
    } else {
      openAtReadingStart();
    }
    window.addEventListener('pageshow', openAtReadingStart, {once: true});
  }

  const suffix = '.localhost';
  const admittedHosts = new Set([
    'fountain.coach',
    'book.fountain.coach',
    'governance.fountain.coach',
    'midi2.fountain.coach',
    'instruments.fountain.coach',
    'status.fountain.coach',
    'teatro.fountain.coach',
    'benedikt-eickhoff.de',
  ]);
  const currentHost = window.location.hostname.endsWith(suffix)
    ? window.location.hostname.slice(0, -suffix.length)
    : window.location.hostname;

  const estateIdsByHost = new Map([
    ['fountain.coach', 'estate'],
    ['book.fountain.coach', 'book'],
    ['governance.fountain.coach', 'governance'],
    ['midi2.fountain.coach', 'midi2'],
    ['instruments.fountain.coach', 'instruments'],
    ['status.fountain.coach', 'status'],
    ['teatro.fountain.coach', 'teatro'],
    ['benedikt-eickhoff.de', 'pointer'],
  ]);
  for (const link of document.querySelectorAll('.estate-nav a')) {
    if (link.dataset.estateId) continue;
    try {
      const target = new URL(link.getAttribute('href'), window.location.href);
      const identity = estateIdsByHost.get(target.hostname.replace(suffix, ''));
      if (identity) link.dataset.estateId = identity;
    } catch {
      // Invalid links remain visible and are reported by static validation.
    }
  }

  // A cached or mixed-domain projection must never leave two estate actions
  // looking current. The authored HTML remains the source of semantics; this
  // only reconciles its current marker with the host actually being viewed.
  for (const link of document.querySelectorAll('.estate-nav a[data-estate-id]')) {
    let target;
    try {
      target = new URL(link.getAttribute('href'), window.location.href);
    } catch {
      continue;
    }
    const targetHost = target.hostname.endsWith(suffix)
      ? target.hostname.slice(0, -suffix.length)
      : target.hostname;
    if (!admittedHosts.has(targetHost)) continue;
    if (targetHost === currentHost) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  // Older direct-static routes may carry the semantic estate links without
  // the visual icon nodes. Hydrate those links into the same seven-icon rail
  // used by the deployed parent estate, without changing their labels or
  // destinations.
  const iconPaths = {
    book: 'M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Zm0 0v12a3 3 0 0 0 3 3',
    governance: 'M12 3 4.5 6v5c0 5 3 8 7.5 10 4.5-2 7.5-5 7.5-10V6L12 3Z',
    midi2: 'M4 6h16M4 12h16M4 18h16M7 4v4m5 2v4m5 2v4',
    instruments: 'M8 4v10m0 0a3 3 0 1 0 2 2.8M8 7h8m0 0v8a3 3 0 1 0 2 2.8M16 7V4',
    status: 'M4 17h3v3H4zM10.5 12h3v8h-3zM17 5h3v15h-3z',
    teatro: 'M4 5h16M6 5v14m12-14v14M4 19h16M8 5c0 4 2 6 4 7 2-1 4-3 4-7',
    pointer: 'm5 4 14 7-6 2-3 7L5 4Z',
  };
  for (const link of document.querySelectorAll('.estate-nav a[data-estate-id]')) {
    if (link.querySelector('svg, img')) continue;
    const label = link.textContent.trim();
    link.textContent = '';
    const id = link.dataset.estateId;
    if (id === 'estate') iconPaths.estate = 'M4 10.5 12 4l8 6.5v8.5h-5v-5H9v5H4z';
    if (iconPaths[id]) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('class', 'estate-symbol');
      svg.setAttribute('data-icon-variant', 'outline-regular-medium');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', iconPaths[id]);
      svg.append(path);
      link.append(svg);
    }
    const text = document.createElement('span');
    text.textContent = label;
    link.append(text);
  }

  // The Linotype roof is clear at the page edge and becomes a readable veil
  // once the document moves beneath it. Keep this state semantic and shared
  // so every estate host reacts identically instead of hard-coding opacity.
  const header = document.querySelector(':where(.site-header, .topbar, header[role="banner"])');
  if (header) {
    const updateHeaderState = () => {
      header.dataset.scrollState = window.scrollY > 2 ? 'scrolled' : 'top';
    };
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, {passive: true});
  }

  // The lower rail is the footer's counterpart to the Linotype roof. An Info
  // action frames the full scientific-footnote stack at the end of the page;
  // after a short dwell it recedes, leaving the logo as the closing mark.
  const footer = document.querySelector('#footer, footer[role="contentinfo"]');
  if (footer) {
    let footerTimer;
    const frameFooter = (intent = 'scroll') => {
      window.clearTimeout(footerTimer);
      footer.dataset.footerState = 'framing';
      footer.dataset.footerIntent = intent;
      footerTimer = window.setTimeout(() => {
        footer.dataset.footerState = 'receding';
      }, intent === 'info' ? 5200 : 3600);
    };
    const footerObserver = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && footer.dataset.footerIntent !== 'info') frameFooter('scroll');
    }, {threshold: .35});
    footerObserver.observe(footer);
    for (const info of document.querySelectorAll('.estate-info')) {
      info.addEventListener('click', () => {
        frameFooter('info');
        window.setTimeout(() => footer.scrollIntoView({behavior: 'smooth', block: 'end'}), 0);
      });
    }
    footer.addEventListener('pointerenter', () => {
      if (footer.dataset.footerState === 'receding') frameFooter('pointer');
    });
    footer.addEventListener('focusin', () => frameFooter('focus'));
  }

  if (!window.location.hostname.endsWith(suffix)) return;
  const previewPort = window.location.port;

  for (const link of document.querySelectorAll('a[href]')) {
    let target;
    try {
      target = new URL(link.getAttribute('href'), window.location.href);
    } catch {
      continue;
    }
    const targetHost = target.hostname.endsWith(suffix)
      ? target.hostname.slice(0, -suffix.length)
      : target.hostname;
    if (target.protocol !== 'https:' || !admittedHosts.has(target.hostname)) continue;
    link.dataset.canonicalHref = target.href;
    target.protocol = 'http:';
    target.hostname = `${target.hostname}${suffix}`;
    target.port = previewPort;
    link.href = target.href;
  }
})();
