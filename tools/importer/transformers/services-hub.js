/* eslint-disable */
/* global WebImporter */

/**
 * JLL services hub transformer (/en-us/services). Only acts for the services-hub template;
 * runs after jll-cleanup.js and service-overview-cleanup.js (which accepts the template
 * with the service-overview rules: link rewriting, layout-only items removed).
 *
 * preprocess (live page, before the importer strips empty links):
 *   The search component lists every service / hub page 12 at a time behind client-side
 *   pagination. Every results page is read by clicking "Next" until it is disabled; each
 *   result { href, title, description, image, alt } is kept as JSON in the
 *   data-excat-search-results attribute of div.search (attributes survive into transform).
 *   Images that do not load (some JLL teaser images 404 and show a logo fallback on the
 *   source) are dropped. The cards-eyebrow parser builds the static snapshot from it.
 *
 * beforeTransform:
 *   The "single" hero (H1 + intro, no media) becomes default content: H1 and paragraphs.
 *   The section style ("light") comes from the template's sections[].
 */

const TEMPLATE = 'services-hub';
const RESULTS_ATTR = 'data-excat-search-results';
const CARD = '.c-default-card';
const MAX_PAGES = 20;

function clean(text) {
  return String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(document, str) {
  const div = document.createElement('div');
  if (!str) return div;
  div.innerHTML = String(str);
  if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
  div.querySelectorAll('script, style').forEach((n) => n.remove());
  return div;
}

function readConfig(root, component) {
  const rc = root.querySelector(`react-component[data-component="${component}"][data-config]`);
  if (!rc) return null;
  try { return JSON.parse(rc.getAttribute('data-config') || 'null'); } catch (e) { return null; }
}

function isTemplate(payload) {
  return Boolean(payload && payload.template && payload.template.name === TEMPLATE);
}

function readCard(card) {
  const link = card.querySelector('a.c-default-card__overlay-link[href], a[href]');
  const header = card.querySelector('[data-testid="c-default-card__content-header"], .c-default-card__content-header');
  const body = card.querySelector('[data-testid="c-default-card__content-body"], .c-default-card__content-body');
  const img = card.querySelector('.c-default-card__image img');
  return {
    href: link ? link.getAttribute('href') : '',
    title: clean(header && header.textContent) || clean(link && link.getAttribute('aria-label')),
    description: clean(body && body.textContent),
    image: img ? img.getAttribute('src') || '' : '',
    alt: img ? img.getAttribute('alt') || '' : '',
  };
}

function imageLoads(win, src) {
  return new Promise((resolve) => {
    const probe = new win.Image();
    const timer = win.setTimeout(() => resolve(false), 10000);
    probe.onload = () => { win.clearTimeout(timer); resolve(probe.naturalWidth > 0); };
    probe.onerror = () => { win.clearTimeout(timer); resolve(false); };
    probe.src = src;
  });
}

async function collectSearchResults(root) {
  const host = root.querySelector('div.search');
  const win = root.ownerDocument && root.ownerDocument.defaultView;
  if (!host || !win) return;
  const wait = (ms) => new Promise((resolve) => { win.setTimeout(resolve, ms); });
  const pageKey = () => [...host.querySelectorAll(CARD)].map((c) => (readCard(c).href || '')).join('|');
  const results = [];
  const seen = new Set();
  let previous = '';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let key = pageKey();
    const start = Date.now();
    while ((!key || key === previous) && Date.now() - start < 10000) {
      await wait(250);
      key = pageKey();
    }
    if (!key || key === previous) break;
    previous = key;
    [...host.querySelectorAll(CARD)].map(readCard).forEach((item) => {
      if (!item.href || !item.title || seen.has(item.href)) return;
      seen.add(item.href);
      results.push(item);
    });
    const next = [...host.querySelectorAll('nav[aria-label="pagination"] button')]
      .find((b) => /next/i.test(clean(b.textContent)));
    if (!next || next.disabled) break;
    next.click();
  }
  const checks = await Promise.all(results.map((item) => (item.image ? imageLoads(win, item.image) : Promise.resolve(false))));
  results.forEach((item, i) => {
    if (!checks[i]) {
      item.image = '';
      item.alt = '';
    }
  });
  if (results.length) host.setAttribute(RESULTS_ATTR, JSON.stringify(results));
}

/** "single" hero (no media) -> H1 + intro paragraphs as default content. */
function heroToDefaultContent(document, root) {
  root.querySelectorAll('div.hero.aem-GridColumn').forEach((hero) => {
    const cfg = readConfig(hero, 'hero');
    if (!cfg || cfg.heroStyle !== 'single' || cfg.imagePath || cfg.withVideo) return;
    const nodes = [];
    const rendered = hero.querySelector('h1');
    const title = clean(decodeHtml(document, cfg.title).textContent) || clean(rendered && rendered.textContent);
    if (title) {
      const h1 = document.createElement('h1');
      h1.textContent = title;
      nodes.push(h1);
    }
    const desc = decodeHtml(document, cfg.description);
    const paras = [...desc.querySelectorAll('p')];
    (paras.length ? paras : [desc]).forEach((src) => {
      const text = clean(src.textContent);
      if (!text) return;
      const p = document.createElement('p');
      p.textContent = text;
      nodes.push(p);
    });
    if (nodes.length) hero.replaceChildren(...nodes);
  });
}

export default function transform(hookName, element, payload) {
  if (!isTemplate(payload)) return;
  const document = element.ownerDocument;

  if (hookName === 'preprocess') {
    // async: the import script awaits the returned promise before the importer runs
    return collectSearchResults(element).catch((e) => console.error('services-hub: search results not collected', e));
  }

  if (hookName === 'beforeTransform') {
    heroToDefaultContent(document, element);
  }
}
