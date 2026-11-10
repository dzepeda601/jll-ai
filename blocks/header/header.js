/*
 * Header block
 *
 * Content lives in nav.plain.html as flat top-level sections, in this order:
 *   1. brand    – logo link
 *   2. locale   – h2 (selector name), current-locale link, then h3 region + list of locale links
 *   3. search   – h2 (panel name), link to the search page (text = placeholder),
 *                 then "recent searches" title and empty-state paragraphs
 *   4. cta      – call-to-action link
 *   5. menu     – one h2 per megamenu trigger; below each h2:
 *                 optional intro paragraph, h3 groups (title, description, link list),
 *                 h4 starts a highlighted area, trailing paragraphs form the panel footer
 *                 (text = caption, link-only paragraph = action button)
 *   6. explore  – h2 (nav name) + list of links
 *   7. labels   – list of "key: text" accessible labels
 * The script only reads that content and adds controls and behaviour.
 */

import { createTag } from '../../scripts/shared.js';

const DESKTOP = window.matchMedia('(width >= 900px)');
const SECTION_NAMES = ['brand', 'locale', 'search', 'cta', 'menu', 'explore', 'labels'];
const RECENT_KEY = 'nav-recent-searches';
const RECENT_MAX = 5;
const LIST_COLUMN_MAX = 8;

let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

/**
 * Fetches the nav fragment (metadata-independent dual fetch).
 * @returns {Promise<{doc: Element, base: string}|null>}
 */
async function fetchNav() {
  // metadata-independent: /content first (localhost), then root (DA/EDS prod)
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const doc = document.createElement('div');
  doc.innerHTML = await resp.text();
  return { doc, base: resp.url };
}

function resolveMedia(root, base) {
  root.querySelectorAll('img[src], source[srcset]').forEach((media) => {
    const attr = media.tagName === 'IMG' ? 'src' : 'srcset';
    const value = media.getAttribute(attr);
    if (value && !/^(https?:|data:|\/)/.test(value)) {
      media.setAttribute(attr, new URL(value, base).href);
    }
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
  return createTag('span', { class: `nav-icon nav-icon-${name}`, 'aria-hidden': 'true' });
}

/* ---------- panel state ---------- */

function getPanel(trigger) {
  return document.getElementById(trigger.getAttribute('aria-controls'));
}

function updatePanelTop(wrapper) {
  const { bottom } = wrapper.getBoundingClientRect();
  wrapper.style.setProperty('--nav-panel-top', `${Math.max(0, Math.round(bottom))}px`);
}

function lockScroll(lock) {
  document.documentElement.classList.toggle('nav-scroll-lock', lock);
}

/** mirrors each toggle's aria-expanded state onto the panel it controls */
function syncPanels(block) {
  block.querySelectorAll('[data-nav-toggle]').forEach((t) => {
    getPanel(t)?.classList.toggle('is-open', t.getAttribute('aria-expanded') === 'true');
  });
  // mobile: an expanded menu trigger replaces the menu list with its sub-panel
  const wrapper = block.querySelector('.nav-wrapper');
  if (!wrapper) return;
  // the locale selector opened from the mobile menu behaves as a sub-panel too
  const subOpen = !DESKTOP.matches && (!!block.querySelector('.nav-trigger[aria-expanded="true"]')
    || (wrapper.classList.contains('is-open') && !!block.querySelector('.nav-locale-trigger[aria-expanded="true"]')));
  if (subOpen && !wrapper.classList.contains('nav-sub-open')) {
    const row = block.querySelector('.nav-row');
    if (row) row.scrollTop = 0;
  }
  wrapper.classList.toggle('nav-sub-open', subOpen);
}

function closeAll(block, except) {
  block.querySelectorAll('[data-nav-toggle][aria-expanded="true"]').forEach((t) => {
    if (t !== except) t.setAttribute('aria-expanded', 'false');
  });
  syncPanels(block);
  if (!except) lockScroll(block.querySelector('.nav-wrapper.is-open') !== null && !DESKTOP.matches);
}

function openPanel(block, trigger) {
  const wrapper = block.querySelector('.nav-wrapper');
  closeAll(block, trigger);
  wrapper.classList.remove('nav-hidden');
  updatePanelTop(wrapper);
  trigger.setAttribute('aria-expanded', 'true');
  syncPanels(block);
  if (DESKTOP.matches) lockScroll(true);
  const focusTarget = getPanel(trigger)?.querySelector('[data-nav-autofocus]');
  if (focusTarget) focusTarget.focus();
}

function togglePanel(block, trigger) {
  if (trigger.getAttribute('aria-expanded') === 'true') {
    trigger.setAttribute('aria-expanded', 'false');
    closeAll(block);
  } else {
    openPanel(block, trigger);
  }
}

function createToggle(block, attrs, children) {
  const button = createTag('button', {
    type: 'button',
    'aria-expanded': 'false',
    'data-nav-toggle': '',
    ...attrs,
  }, children);
  button.addEventListener('click', () => togglePanel(block, button));
  return button;
}

/* ---------- links ---------- */

function getPrimaryHost(root) {
  const counts = {};
  root.querySelectorAll('a[href]').forEach((a) => {
    const { hostname } = new URL(a.href, window.location.href);
    if (hostname !== window.location.hostname) counts[hostname] = (counts[hostname] || 0) + 1;
  });
  return Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0];
}

function decorateExternalLinks(root, primaryHost, newTabLabel) {
  root.querySelectorAll('a[href]').forEach((a) => {
    if (a.closest('.nav-locale-panel')) return;
    const { hostname } = new URL(a.href, window.location.href);
    if (hostname === window.location.hostname || hostname === primaryHost) return;
    a.target = '_blank';
    a.rel = 'noopener';
    if (newTabLabel) a.setAttribute('aria-label', `${textOf(a)}, ${newTabLabel}`);
  });
}

/* ---------- megamenu panels ---------- */

/**
 * Splits the nodes following a trigger heading into intro, groups, highlight and footer.
 * @param {Element[]} nodes
 */
function parsePanel(nodes) {
  const model = {
    intro: [], groups: [], highlight: null, caption: [], actions: [],
  };
  let target = model.groups;
  let current = null;
  let inFooter = false;
  nodes.forEach((node) => {
    const tag = node.tagName;
    if (tag === 'H3' && !inFooter) {
      current = { title: node, desc: null, list: null };
      target.push(current);
    } else if (tag === 'H4' && !inFooter) {
      model.highlight = { label: node, groups: [] };
      target = model.highlight.groups;
      current = null;
    } else if (tag === 'UL' && !inFooter) {
      if (current && !current.list) {
        current.list = node;
      } else {
        current = { title: null, desc: null, list: node };
        target.push(current);
      }
    } else if (tag === 'P') {
      const onlyLink = node.children.length === 1 && node.firstElementChild.tagName === 'A'
        && textOf(node) === textOf(node.firstElementChild);
      if (!inFooter && !current && !model.groups.length && !model.highlight) {
        model.intro.push(node);
      } else if (!inFooter && current && !current.desc && !current.list) {
        current.desc = node;
      } else {
        inFooter = true;
        if (onlyLink) model.actions.push(node.firstElementChild);
        else model.caption.push(node);
      }
    }
  });
  return model;
}

function splitList(list) {
  const items = [...list.children];
  const cols = Math.ceil(items.length / LIST_COLUMN_MAX);
  if (cols < 2) return [list];
  const base = Math.floor(items.length / cols);
  const extra = items.length % cols;
  const lists = [];
  let start = 0;
  for (let i = 0; i < cols; i += 1) {
    const size = base + (i < extra ? 1 : 0);
    const ul = document.createElement('ul');
    ul.append(...items.slice(start, start + size));
    lists.push(ul);
    start += size;
  }
  return lists;
}

function buildCard(group) {
  const link = group.title.querySelector('a');
  const card = createTag('a', { class: 'nav-card', href: link.href });
  card.append(
    createTag('span', { class: 'nav-card-title' }, textOf(link)),
    createTag('span', { class: 'nav-card-desc' }, textOf(group.desc)),
    icon('chevron-right'),
  );
  return createTag('li', { class: 'nav-cards-item' }, card);
}

function buildGroup(group) {
  const el = createTag('div', { class: 'nav-group' });
  if (group.title) {
    const link = group.title.querySelector('a');
    if (link) {
      const titleLink = createTag('a', { class: 'nav-group-title nav-group-title-link', href: link.href }, textOf(link));
      titleLink.append(icon('chevron-right'));
      el.append(titleLink);
    } else {
      el.append(createTag('p', { class: 'nav-group-title' }, textOf(group.title)));
    }
  }
  if (group.desc) el.append(createTag('p', { class: 'nav-group-desc' }, [...group.desc.childNodes]));
  if (group.list) {
    group.list.classList.add('nav-group-links');
    el.append(group.list);
  }
  return el;
}

function isCard(group) {
  return group.title?.querySelector('a') && !group.list;
}

function buildGroups(groups) {
  const cards = groups.filter(isCard);
  if (cards.length && cards.length === groups.length) {
    // cards flow top-to-bottom in up to two independent columns
    const wrap = createTag('div', { class: 'nav-cards' });
    const perColumn = Math.ceil(cards.length / 2);
    for (let i = 0; i < cards.length; i += perColumn) {
      const column = createTag('ul', { class: 'nav-cards-column' });
      column.append(...cards.slice(i, i + perColumn).map(buildCard));
      wrap.append(column);
    }
    return wrap;
  }
  const wrap = createTag('div', { class: 'nav-groups' });
  groups.forEach((group) => {
    if (!group.title && !group.desc && group.list) {
      splitList(group.list).forEach((list) => wrap.append(buildGroup({ list })));
    } else {
      wrap.append(buildGroup(group));
    }
  });
  return wrap;
}

function buildMegamenuPanel(model, id, label) {
  const panel = createTag('div', {
    class: 'nav-megamenu-panel nav-panel', id, role: 'region', 'aria-label': label,
  });
  const inner = createTag('div', { class: 'nav-panel-inner' });
  const body = createTag('div', { class: 'nav-panel-body' });
  model.intro.forEach((p) => body.append(createTag('p', { class: 'nav-panel-title' }, [...p.childNodes])));
  body.append(buildGroups(model.groups));
  if (model.highlight) {
    const highlight = createTag('div', { class: 'nav-panel-highlight' });
    highlight.append(
      createTag('p', { class: 'nav-highlight-label' }, textOf(model.highlight.label)),
      buildGroups(model.highlight.groups),
    );
    body.append(highlight);
    body.classList.add('nav-panel-body-highlight');
  }
  inner.append(body);
  if (model.caption.length || model.actions.length) {
    const footer = createTag('div', { class: 'nav-panel-footer' });
    model.caption.forEach((p) => footer.append(createTag('p', { class: 'nav-panel-caption' }, [...p.childNodes])));
    if (model.actions.length) {
      const actions = createTag('div', { class: 'nav-panel-actions' });
      model.actions.forEach((a) => {
        a.className = 'nav-panel-action';
        actions.append(a);
      });
      footer.append(actions);
    }
    inner.append(footer);
  }
  panel.append(inner);
  return panel;
}

function buildMainNav(block, section, label) {
  const nav = createTag('nav', { class: 'nav-main', 'aria-label': label });
  const menu = createTag('ul', { class: 'nav-menu' });
  const children = [...(section?.children || [])];
  children.forEach((node, i) => {
    if (node.tagName !== 'H2') return;
    const end = children.findIndex((n, j) => j > i && n.tagName === 'H2');
    const nodes = children.slice(i + 1, end < 0 ? undefined : end);
    const id = nextId('nav-panel');
    const name = textOf(node);
    const trigger = createToggle(block, { class: 'nav-trigger', 'aria-controls': id }, name);
    const item = createTag('li', { class: 'nav-item' });
    const panel = buildMegamenuPanel(parsePanel(nodes), id, name);
    // sub-panel heading, shown only when the panel is drilled into on mobile
    panel.querySelector('.nav-panel-inner').prepend(createTag('p', { class: 'nav-panel-label' }, name));
    item.append(trigger, panel);
    menu.append(item);
  });
  nav.append(menu);
  return nav;
}

/* ---------- locale selector ---------- */

function buildLocale(block, section) {
  if (!section) return null;
  const name = textOf(section.querySelector('h2'));
  const current = section.querySelector(':scope > p a');
  const wrap = createTag('div', { class: 'nav-locale' });
  const id = nextId('nav-locale-panel');
  const trigger = createToggle(block, {
    class: 'nav-locale-trigger', 'aria-controls': id, 'aria-label': `${name}, ${textOf(current)}`,
  });
  const flag = current?.querySelector('img');
  if (flag) trigger.append(flag.cloneNode(true));
  trigger.append(createTag('span', { class: 'nav-locale-name' }, textOf(current)), icon('chevron-down'));

  const panel = createTag('div', {
    class: 'nav-locale-panel nav-panel', id, role: 'region', 'aria-label': name,
  });
  const inner = createTag('div', { class: 'nav-panel-inner nav-regions' });
  const currentPath = current ? new URL(current.href).href : '';
  section.querySelectorAll(':scope > h3').forEach((h3) => {
    const list = h3.nextElementSibling?.tagName === 'UL' ? h3.nextElementSibling : null;
    if (!list) return;
    const region = createTag('details', { class: 'nav-region' });
    const summary = createTag('summary', { class: 'nav-region-title' }, textOf(h3));
    summary.append(icon('chevron-down'));
    list.classList.add('nav-region-list');
    list.querySelectorAll('a').forEach((a) => {
      a.classList.add('nav-country');
      if (a.href === currentPath) {
        a.setAttribute('aria-current', 'true');
        region.open = true;
      }
    });
    region.append(summary, list);
    region.addEventListener('toggle', () => {
      if (!region.open) return;
      inner.querySelectorAll('.nav-region[open]').forEach((r) => {
        if (r !== region) r.open = false;
      });
    });
    inner.append(region);
  });
  if (!inner.querySelector('.nav-region[open]') && inner.firstElementChild) inner.firstElementChild.open = true;
  panel.append(inner);
  wrap.append(trigger, panel);
  return wrap;
}

/* ---------- search ---------- */

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveRecent(query) {
  const recent = [query, ...readRecent().filter((q) => q !== query)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch (e) {
    // storage unavailable
  }
}

function buildSearch(block, section, labels) {
  if (!section) return { trigger: null, panel: null };
  const name = textOf(section.querySelector('h2'));
  const link = section.querySelector('a');
  const [recentTitle, emptyText] = [...section.querySelectorAll(':scope > p')]
    .filter((p) => !p.querySelector('a'))
    .map(textOf);
  const placeholder = textOf(link);
  const action = new URL(link.href);
  const param = [...action.searchParams.keys()][0] || 'q';

  const id = nextId('nav-search-panel');
  const trigger = createToggle(block, {
    class: 'nav-search-trigger', 'aria-controls': id, 'aria-label': placeholder,
  }, [
    icon('search'),
    icon('close'),
    createTag('span', { class: 'nav-tool-label' }, labels.search || ''),
    createTag('span', { class: 'nav-tool-label-open' }, labels['close-menu'] || ''),
  ]);
  // on mobile the search sheet replaces an open menu
  trigger.addEventListener('click', () => {
    if (!DESKTOP.matches && trigger.getAttribute('aria-expanded') === 'true') toggleMenu(block, false, true);
  });
  const triggerWrap = createTag('div', { class: 'nav-search' }, trigger);

  const panel = createTag('div', {
    class: 'nav-search-panel nav-panel', id, role: 'region', 'aria-label': name,
  });
  const inner = createTag('div', { class: 'nav-panel-inner' });
  const form = createTag('form', { class: 'nav-search-form', role: 'search', action: `${action.origin}${action.pathname}` });
  const input = createTag('input', {
    class: 'nav-search-input',
    type: 'search',
    name: param,
    placeholder,
    'aria-label': placeholder,
    autocomplete: 'off',
    'data-nav-autofocus': '',
  });
  const clear = createTag('button', { class: 'nav-search-clear', type: 'button', 'aria-label': labels['clear-search'] || '' }, icon('cancel'));
  clear.addEventListener('click', () => {
    input.value = '';
    input.focus();
  });
  form.append(icon('search'), input, clear);

  const recent = createTag('div', { class: 'nav-search-recent' });
  const renderRecent = () => {
    const queries = readRecent();
    recent.replaceChildren(createTag('p', { class: 'nav-search-recent-title' }, recentTitle || ''));
    if (!queries.length) {
      recent.append(createTag('p', { class: 'nav-search-recent-empty' }, emptyText || ''));
      return;
    }
    const list = createTag('ul', { class: 'nav-search-recent-list' });
    queries.forEach((q) => {
      const url = new URL(action.href);
      url.searchParams.set(param, q);
      list.append(createTag('li', {}, createTag('a', { href: url.href }, q)));
    });
    recent.append(list);
  };
  renderRecent();
  trigger.addEventListener('click', renderRecent);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    saveRecent(query);
    const url = new URL(action.href);
    url.searchParams.set(param, query);
    window.location.href = url.href;
  });

  inner.append(form, recent);
  panel.append(inner);
  return { trigger: triggerWrap, panel };
}

/* ---------- mobile menu ---------- */

/**
 * Opens/closes the mobile menu.
 * @param {Element} block
 * @param {boolean} [open] force state
 * @param {boolean} [keepPanels] keep other panels (e.g. search) open when closing
 */
function toggleMenu(block, open, keepPanels = false) {
  const wrapper = block.querySelector('.nav-wrapper');
  const button = block.querySelector('.nav-hamburger button');
  const expand = open ?? !wrapper.classList.contains('is-open');
  if (expand) closeAll(block);
  wrapper.classList.toggle('is-open', expand);
  button.setAttribute('aria-expanded', String(expand));
  button.setAttribute('aria-label', button.dataset[expand ? 'labelClose' : 'labelOpen'] || '');
  if (!expand && !keepPanels) closeAll(block);
  if (!expand && keepPanels) {
    block.querySelectorAll('.nav-trigger[aria-expanded="true"], .nav-locale-trigger[aria-expanded="true"]')
      .forEach((t) => t.setAttribute('aria-expanded', 'false'));
    syncPanels(block);
  }
  lockScroll(!DESKTOP.matches && (expand || !!block.querySelector('[data-nav-toggle][aria-expanded="true"]')));
}

/** mobile: leave a drilled-in sub-panel and return to the menu list */
function closeSubPanel(block) {
  const open = block.querySelector('.nav-trigger[aria-expanded="true"], .nav-locale-trigger[aria-expanded="true"]');
  if (!open) return;
  open.setAttribute('aria-expanded', 'false');
  syncPanels(block);
  open.focus();
}

/**
 * Below the desktop breakpoint the locale selector and CTA live at the end of the menu;
 * on desktop they sit in the top bar.
 */
function arrangeForViewport(block) {
  const tools = block.querySelector('.nav-tools');
  const rowTools = block.querySelector('.nav-row-tools');
  const locale = block.querySelector('.nav-locale');
  const cta = block.querySelector('.nav-cta');
  if (DESKTOP.matches) {
    if (locale) tools.prepend(locale);
    if (cta) tools.append(cta);
  } else {
    if (cta) rowTools.append(cta);
    if (locale) rowTools.append(locale);
  }
}

/* ---------- block ---------- */

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  if (!fragment) return;
  resolveMedia(fragment.doc, fragment.base);
  const sections = {};
  [...fragment.doc.children].filter((el) => el.tagName === 'DIV').forEach((el, i) => {
    sections[SECTION_NAMES[i] || `extra-${i}`] = el;
  });
  const labels = parseLabels(sections.labels);

  const wrapper = createTag('div', { class: 'nav-wrapper' });
  const bar = createTag('div', { class: 'nav-bar' });

  const brand = createTag('div', { class: 'nav-brand' });
  const brandLink = sections.brand?.querySelector('a');
  if (brandLink) {
    brandLink.className = 'nav-brand-link';
    if (!brandLink.getAttribute('aria-label')) {
      brandLink.setAttribute('aria-label', brandLink.querySelector('img')?.alt || textOf(brandLink));
    }
    const [full, ...compact] = sections.brand.querySelectorAll('img');
    full?.classList.add('nav-brand-full');
    full?.setAttribute('fetchpriority', 'high');
    compact.forEach((img) => {
      img.classList.add('nav-brand-compact');
      brandLink.append(img);
    });
    brand.append(brandLink);
  }

  const tools = createTag('div', { class: 'nav-tools' });
  const locale = buildLocale(block, sections.locale);
  const search = buildSearch(block, sections.search, labels);
  const cta = sections.cta?.querySelector('a');
  if (locale) tools.append(locale);
  if (search.trigger) tools.append(search.trigger);
  if (cta) {
    cta.className = 'nav-cta';
    tools.append(cta);
  }

  const hamburger = createTag('div', { class: 'nav-hamburger' });
  const hamburgerButton = createTag('button', {
    type: 'button',
    'aria-controls': 'nav-row',
    'aria-expanded': 'false',
    'aria-label': labels['open-menu'] || '',
    'data-label-open': labels['open-menu'] || '',
    'data-label-close': labels['close-menu'] || '',
  }, [
    icon('menu'),
    icon('close'),
    createTag('span', { class: 'nav-tool-label' }, labels['open-menu'] || ''),
    createTag('span', { class: 'nav-tool-label-open' }, labels['close-menu'] || ''),
  ]);
  hamburgerButton.addEventListener('click', () => toggleMenu(block));
  hamburger.append(hamburgerButton);

  // mobile back buttons (top bar icon + toolbar button) for drilled-in sub-panels
  const backBar = createTag('button', { type: 'button', class: 'nav-back nav-back-bar', 'aria-label': labels.back || '' }, icon('arrow-back'));
  const backToolbar = createTag('button', { type: 'button', class: 'nav-back nav-back-toolbar' }, [
    icon('arrow-back'),
    createTag('span', { class: 'nav-tool-label' }, labels.back || ''),
  ]);
  [backBar, backToolbar].forEach((b) => b.addEventListener('click', () => closeSubPanel(block)));

  bar.append(brand, backBar, tools, backToolbar, hamburger);

  const row = createTag('div', { class: 'nav-row', id: 'nav-row' });
  row.append(buildMainNav(block, sections.menu, labels['main-navigation'] || ''));
  if (sections.explore) {
    const explore = createTag('nav', { class: 'nav-explore', 'aria-label': textOf(sections.explore.querySelector('h2')) });
    const list = sections.explore.querySelector('ul');
    if (list) explore.append(list);
    row.append(explore);
  }
  row.append(createTag('div', { class: 'nav-row-tools' }));

  wrapper.append(bar, row);
  if (search.panel) wrapper.append(search.panel);

  decorateExternalLinks(wrapper, getPrimaryHost(fragment.doc), labels['new-tab']);

  block.replaceChildren(wrapper);
  arrangeForViewport(block);

  // close on Escape / outside click
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = block.querySelector('[data-nav-toggle][aria-expanded="true"]');
    closeAll(block);
    if (wrapper.classList.contains('is-open')) toggleMenu(block, false);
    if (open && open.offsetParent) open.focus();
  });
  document.addEventListener('click', (e) => {
    if (!block.contains(e.target)) closeAll(block);
  });

  // hide on scroll down, reveal on scroll up
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const anyOpen = block.querySelector('[data-nav-toggle][aria-expanded="true"]') || wrapper.classList.contains('is-open');
    if (!anyOpen) wrapper.classList.toggle('nav-hidden', y > lastY && y > wrapper.offsetHeight);
    lastY = y;
  }, { passive: true });

  // keep panels under the header bar
  new ResizeObserver(() => updatePanelTop(wrapper)).observe(wrapper);

  // reset state when crossing the desktop breakpoint
  DESKTOP.addEventListener('change', () => {
    closeAll(block);
    toggleMenu(block, false);
    wrapper.classList.remove('nav-hidden', 'nav-sub-open');
    arrangeForViewport(block);
  });
}
