/*
 * Footer block
 *
 * Content lives in footer.plain.html as flat top-level sections, in this order:
 *   1. brand   – logo link, then an optional compact logo image (used on small screens)
 *   2. intro   – intro paragraph, call-to-action link, list of social links (image links)
 *   3. links   – one h2 + list of links per link column
 *   4. legal   – h2 (menu name) + list of legal links, then the copyright paragraph
 *   5. locale  – h2 (selector name), current-locale link, then h3 region + list of locale links
 *   6. labels  – list of "key: text" accessible labels
 * The script only reads that content and adds layout, controls and behaviour.
 * Below 1200px the link columns (and the legal links) become a single-open accordion.
 */

import { createTag } from '../../scripts/shared.js';

const SECTION_NAMES = ['brand', 'intro', 'links', 'legal', 'locale', 'labels'];
const DESKTOP = window.matchMedia('(width >= 1200px)');
const SVG_NS = 'http://www.w3.org/2000/svg';

let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

/**
 * Fetches the footer fragment (metadata-independent dual fetch).
 * @returns {Promise<{doc: Element, base: string}|null>}
 */
async function fetchFooter() {
  // metadata-independent: /content first (localhost), then root (DA/EDS prod)
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const doc = document.createElement('div');
  doc.innerHTML = await resp.text();
  return { doc, base: resp.url };
}

function resolveMedia(root, base) {
  root.querySelectorAll('img[src]').forEach((img) => {
    const value = img.getAttribute('src');
    if (value && !/^(https?:|data:|\/)/.test(value)) img.setAttribute('src', new URL(value, base).href);
  });
}

function parseLabels(section) {
  const labels = {};
  section?.querySelectorAll('li').forEach((li) => {
    const text = li.textContent.trim();
    const i = text.indexOf(':');
    if (i > 0) labels[text.slice(0, i).trim()] = text.slice(i + 1).trim();
  });
  return labels;
}

function textOf(el) {
  return el ? el.textContent.trim() : '';
}

function icon(name) {
  return createTag('span', { class: `footer-icon footer-icon-${name}`, 'aria-hidden': 'true' });
}

/** Accordion chevron (inline SVG so it can rotate with the open state). */
function chevron() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'footer-chevron');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'm6 9 6 6 6-6');
  svg.append(path);
  return svg;
}

/** Links to other hosts open in a new tab (locale links are handled separately). */
function markExternal(root, labels) {
  root.querySelectorAll('a[href]').forEach((a) => {
    if (a.hostname === window.location.hostname) return;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const hint = labels['new-tab'];
    if (!hint) return;
    const name = a.getAttribute('aria-label');
    if (name) a.setAttribute('aria-label', `${name}, ${hint}`);
    else a.append(createTag('span', { class: 'footer-sr-only' }, `, ${hint}`));
  });
}

/* ---------- main band ---------- */

function buildTop(brand, labels) {
  const top = createTag('div', { class: 'footer-top' });
  const logo = brand?.querySelector('a');
  if (logo) {
    logo.className = 'footer-logo';
    const full = logo.querySelector('img');
    if (full) {
      full.classList.add('footer-logo-full');
      logo.setAttribute('aria-label', full.alt);
      full.alt = '';
    }
    const compact = brand.querySelector(':scope > p > img');
    if (compact) {
      compact.classList.add('footer-logo-compact');
      compact.alt = '';
      logo.append(compact);
    }
    top.append(logo);
  }
  const backToTop = createTag('button', {
    type: 'button', class: 'footer-back-to-top', 'aria-label': labels['back-to-top'],
  }, icon('arrow-up'));
  backToTop.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  top.append(backToTop);
  return top;
}

function buildIntro(section) {
  const intro = createTag('div', { class: 'footer-intro' });
  if (!section) return intro;
  section.querySelectorAll(':scope > p').forEach((p) => {
    const link = p.querySelector('a');
    if (link && textOf(p) === textOf(link)) {
      p.className = 'footer-cta';
      link.className = 'footer-subscribe';
      link.append(icon('arrow-forward'));
    } else {
      p.className = 'footer-brief';
    }
    intro.append(p);
  });
  const social = section.querySelector(':scope > ul');
  if (social) {
    social.className = 'footer-social';
    social.querySelectorAll('a').forEach((a) => {
      a.className = 'footer-social-link';
      const img = a.querySelector('img');
      if (img) {
        a.setAttribute('aria-label', img.alt);
        img.alt = '';
      }
    });
    intro.append(social);
  }
  return intro;
}

/* ---------- accordion (small screens) ---------- */

function setAccordion(trigger, open) {
  const item = trigger.closest('.footer-column');
  trigger.setAttribute('aria-expanded', String(open));
  item.classList.toggle('is-open', open);
  if (item.onToggle) item.onToggle(open);
}

function applyAccordionMode(columns) {
  columns.querySelectorAll('.footer-column-toggle').forEach((trigger) => {
    if (DESKTOP.matches) {
      setAccordion(trigger, false);
      trigger.removeAttribute('aria-expanded');
      trigger.removeAttribute('aria-controls');
      trigger.tabIndex = -1;
    } else {
      trigger.setAttribute('aria-expanded', String(trigger.closest('.footer-column').classList.contains('is-open')));
      trigger.setAttribute('aria-controls', trigger.dataset.controls);
      trigger.tabIndex = 0;
    }
  });
}

/**
 * Builds one column: h2 title (holding the accordion toggle) + link list.
 * @returns {Element} nav element
 */
function buildColumn(columns, title, list) {
  const nav = createTag('nav', { class: 'footer-column', 'aria-label': title });
  const id = nextId('footer-column-links');
  const trigger = createTag('button', {
    type: 'button', class: 'footer-column-toggle', 'data-controls': id,
  }, [createTag('span', {}, title), chevron()]);
  trigger.addEventListener('click', () => {
    if (DESKTOP.matches) return;
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    columns.querySelectorAll('.footer-column.is-open .footer-column-toggle').forEach((t) => {
      if (t !== trigger) setAccordion(t, false);
    });
    setAccordion(trigger, open);
  });
  nav.append(createTag('h2', { class: 'footer-column-title' }, trigger));
  list.className = 'footer-column-links';
  list.id = id;
  nav.append(list);
  columns.append(nav);
  return nav;
}

function buildColumns(section) {
  const columns = createTag('div', { class: 'footer-columns' });
  section?.querySelectorAll(':scope > h2').forEach((h2) => {
    const list = h2.nextElementSibling?.tagName === 'UL' ? h2.nextElementSibling : createTag('ul');
    list.querySelectorAll('a').forEach((a) => { a.className = 'footer-link'; });
    buildColumn(columns, textOf(h2), list);
  });
  return columns;
}

/* ---------- popups (legal menu, locale panel) ---------- */

function setOpen(trigger, open) {
  const panel = document.getElementById(trigger.getAttribute('aria-controls'));
  if (!panel) return;
  trigger.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
  const { onToggle } = trigger;
  if (onToggle) onToggle(open);
}

function closeAll(block, except) {
  block.querySelectorAll('[data-footer-toggle][aria-expanded="true"]').forEach((t) => {
    if (t !== except) setOpen(t, false);
  });
}

function createToggle(block, attrs, content) {
  const trigger = createTag('button', {
    type: 'button', 'aria-expanded': 'false', 'data-footer-toggle': '', ...attrs,
  }, content);
  trigger.addEventListener('click', () => {
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    closeAll(block, trigger);
    setOpen(trigger, open);
  });
  return trigger;
}

/** Fills a list with copies of the legal links while it is open (like the source). */
function renderLinks(target, items, linkClass, onPick) {
  target.replaceChildren(...items.map((li) => {
    const copy = li.cloneNode(true);
    copy.querySelectorAll('a').forEach((a) => {
      a.className = linkClass;
      a.addEventListener('click', onPick);
    });
    return copy;
  }));
}

/**
 * Legal links: a dropdown in the legal bar (desktop) and an accordion item (small screens).
 * The links are only rendered while the dropdown or accordion item is open.
 */
function buildLegal(block, section, columns, labels) {
  const wrap = createTag('div', { class: 'footer-legal' });
  const source = section?.querySelector(':scope > ul');
  if (!source) return wrap;
  markExternal(source, labels);
  const items = [...source.children];
  const name = textOf(section.querySelector('h2'));

  const id = nextId('footer-legal-menu');
  const trigger = createToggle(block, {
    class: 'footer-legal-trigger', 'aria-controls': id, 'aria-haspopup': 'true',
  }, [createTag('span', {}, name), icon('chevron-down')]);
  const menu = createTag('ul', { class: 'footer-legal-menu', id, hidden: '' });
  trigger.onToggle = (open) => {
    if (open) renderLinks(menu, items, 'footer-legal-link', () => setOpen(trigger, false));
    else menu.replaceChildren();
  };
  wrap.append(trigger, menu);

  const accordionList = createTag('ul');
  const item = buildColumn(columns, name, accordionList);
  item.classList.add('footer-column-legal');
  item.onToggle = (open) => {
    if (open) renderLinks(accordionList, items, 'footer-link', () => {});
    else accordionList.replaceChildren();
  };
  return wrap;
}

function buildLocale(block, section, labels) {
  if (!section) return { trigger: null, panel: null, backdrop: null };
  const name = textOf(section.querySelector('h2'));
  const current = section.querySelector(':scope > p a');
  const id = nextId('footer-locale-panel');
  const trigger = createToggle(block, {
    class: 'footer-locale-trigger', 'aria-controls': id, 'aria-label': `${name}, ${textOf(current)}`,
  });
  const flag = current?.querySelector('img');
  if (flag) trigger.append(flag.cloneNode(true));
  trigger.append(createTag('span', { class: 'footer-locale-name' }, textOf(current)), icon('chevron-down'));

  const panel = createTag('div', {
    class: 'footer-locale-panel', id, role: 'dialog', 'aria-label': name, hidden: '',
  });
  const inner = createTag('div', { class: 'footer-regions' });
  const currentHref = current ? current.href : '';
  section.querySelectorAll(':scope > h3').forEach((h3) => {
    const list = h3.nextElementSibling?.tagName === 'UL' ? h3.nextElementSibling : null;
    if (!list) return;
    const region = createTag('details', { class: 'footer-region' });
    const summary = createTag('summary', { class: 'footer-region-title' }, [createTag('span', {}, textOf(h3)), icon('chevron-down')]);
    list.className = 'footer-countries';
    list.querySelectorAll('a').forEach((a) => {
      a.className = 'footer-country';
      a.querySelector('img')?.setAttribute('loading', 'lazy');
      if (a.href === currentHref) {
        a.setAttribute('aria-current', 'true');
        region.open = true;
      }
    });
    region.append(summary, list);
    region.addEventListener('toggle', () => {
      if (!region.open) return;
      inner.querySelectorAll('.footer-region[open]').forEach((r) => {
        if (r !== region) r.open = false;
      });
    });
    inner.append(region);
  });
  if (!inner.querySelector('.footer-region[open]') && inner.firstElementChild) inner.firstElementChild.open = true;

  const backdrop = createTag('button', {
    type: 'button', class: 'footer-backdrop', 'aria-label': labels['close-panel'], tabindex: '-1', hidden: '',
  });
  backdrop.addEventListener('click', () => setOpen(trigger, false));
  // the country list is only in the page while the panel is open (like the source)
  trigger.onToggle = (open) => {
    if (open) panel.append(inner);
    else inner.remove();
    backdrop.hidden = !open;
    document.documentElement.classList.toggle('footer-scroll-lock', open);
  };
  return { trigger, panel, backdrop };
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooter();
  if (!fragment) return;
  const { doc, base } = fragment;
  resolveMedia(doc, base);
  const sections = {};
  [...doc.children].forEach((section, i) => {
    if (SECTION_NAMES[i]) sections[SECTION_NAMES[i]] = section;
  });
  const labels = parseLabels(sections.labels);

  const main = createTag('div', { class: 'footer-main' });
  const columns = buildColumns(sections.links);
  const body = createTag('div', { class: 'footer-body' }, [buildIntro(sections.intro), columns]);
  main.append(buildTop(sections.brand, labels), body);
  markExternal(main, labels);

  const bar = createTag('div', { class: 'footer-bar' });
  const barInner = createTag('div', { class: 'footer-bar-inner' });
  const legal = buildLegal(block, sections.legal, columns, labels);
  const end = createTag('div', { class: 'footer-bar-end' });
  const copyright = sections.legal?.querySelector(':scope > p');
  if (copyright) {
    copyright.className = 'footer-copyright';
    end.append(copyright);
  }
  const locale = buildLocale(block, sections.locale, labels);
  if (locale.trigger) end.append(createTag('div', { class: 'footer-locale' }, locale.trigger));
  barInner.append(legal, end);
  bar.append(barInner);

  block.replaceChildren(main, bar);
  if (locale.panel) block.append(locale.backdrop, locale.panel);

  applyAccordionMode(columns);
  DESKTOP.addEventListener('change', () => {
    closeAll(block);
    applyAccordionMode(columns);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = block.querySelector('[data-footer-toggle][aria-expanded="true"]');
    if (!open) return;
    closeAll(block);
    open.focus();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.footer-legal')) {
      const legalTrigger = block.querySelector('.footer-legal-trigger[aria-expanded="true"]');
      if (legalTrigger) setOpen(legalTrigger, false);
    }
  });
}
