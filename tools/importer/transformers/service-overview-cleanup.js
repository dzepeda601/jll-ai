/* eslint-disable */
/* global WebImporter */

/**
 * JLL service-overview cleanup transformer (runs after jll-cleanup.js).
 * Only acts for the service-overview template, so the home import is unaffected.
 *
 * preprocess (called from the import script's preprocess hook, i.e. before the importer
 *   strips empty inline elements): JLL cards use an empty overlay <a> (aria-label only)
 *   as the card link. The importer removes such links before transform, so their href
 *   and aria-label are pinned on the parent element as data-excat-href / data-excat-label.
 *
 * beforeTransform:
 *   - removes layout-only grid items (spacer, separator, ghost)
 *   - removes hidden or empty components: the hidden "Ready to get started?" CTA banner
 *     (hideBanner: true), banners / jumppoints / accordions without content
 *   - rewrites editorial components (H2 + rich text) as clean default content and marks
 *     the contact heading (editorial directly before the eloqua form)
 *
 * afterTransform:
 *   - in-page CTA anchors that target the contact form (#input-form, #contactus, ...)
 *     point to the contact heading's generated id
 *   - https://www.jll.com/en-us/... links become site-relative (.html dropped); links to
 *     other JLL locales / DAM assets and other domains stay absolute
 *   - removes the temporary data-excat-* attributes
 *
 * service-detail template (same components plus a few more); everything below only runs
 * for it, so the service-overview output is unchanged:
 *   - editorial sub-headings (H3 in the rich text) are kept as H3
 *   - empty "message" banners are removed
 *   - "fullwidthmessage" banners become default content (statement paragraph + CTA) and
 *     the secondary navigation becomes a list of in-page links; both components get a
 *     data-excat-style marker that the sections transformer turns into a section style
 *     ("statement", "link-bar")
 *   - featured video tiles are scrolled into view like the video banners
 *   - in-page links to a component's anchorId (e.g. "/#faqs") point to the generated id
 *     of that component's heading
 *
 * service-landing template: everything the service-detail template does, plus (landing only):
 *   - "section heading" components (two-line display title, e.g. "Meeting / Your needs")
 *     become one H2; the sections transformer keeps it with the component after it
 *
 * service-design template (/en-us/services/design): the same steps as service-landing, plus
 *   - links to internal AEM paths of the US site (/content/jll-com-phoenix/country/amer/us/en/x.html,
 *     which JLL redirects to /en-us/x) point to /en-us/x before the links are made site-relative
 *
 * services-hub template (/en-us/services): the service-overview steps only; its own steps
 * (search results snapshot, hero as default content) are in services-hub.js.
 */

const TEMPLATE = 'service-overview';
const DETAIL_TEMPLATE = 'service-detail';
const LANDING_TEMPLATE = 'service-landing';
const DESIGN_TEMPLATE = 'service-design';
// services hub (/en-us/services): service-overview rules; its own steps are in services-hub.js
const HUB_TEMPLATE = 'services-hub';
const STYLE_MARK = 'data-excat-style';
const ANCHORS_MARK = 'data-excat-anchors';
const CONTACT_KEY = ' contact';
const ORIGIN = 'https://www.jll.com';
const PIN_HREF = 'data-excat-href';
const PIN_LABEL = 'data-excat-label';
const CONTACT_MARK = 'data-excat-contact';
const CONTACT_ANCHORS = ['input-form', 'contactus', 'contact-us', 'get-started', 'contact'];
const SITE_HOSTS = ['www.jll.com', 'jll.com'];
const SITE_LOCALE = /^\/en-us(\/|$)/i;
const AEM_SITE_ROOT = /^\/content\/jll-com-phoenix\/country\/amer\/us\/en(\/|$)/i;

function clean(text) {
  return String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function absUrl(url) {
  if (!url) return '';
  const value = String(url).trim();
  if (!value || value.startsWith('#') || /^(mailto|tel|javascript):/i.test(value)) return value;
  try {
    return new URL(value.startsWith('//') ? `https:${value}` : value, ORIGIN).href;
  } catch (e) {
    return value;
  }
}

function decodeHtml(document, str) {
  const div = document.createElement('div');
  if (!str) return div;
  div.innerHTML = String(str);
  if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
  div.querySelectorAll('script, style').forEach((n) => n.remove());
  return div;
}

/** Paragraphs / lists with inline formatting and links kept, wrappers and attributes dropped. */
function richParagraphs(document, container, keepHeadings = false) {
  const out = [];
  const sel = keepHeadings ? 'p, ul, ol, h1, h2, h3, h4, h5, h6' : 'p, ul, ol';
  const blocks = [...container.querySelectorAll(sel)].filter((n) => !n.parentElement.closest(sel));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  sources.forEach((src) => {
    let tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : 'p';
    if (keepHeadings && /^H[1-6]$/.test(src.tagName)) tag = 'h3';
    const node = document.createElement(tag);
    node.innerHTML = src.innerHTML;
    node.querySelectorAll('span, font').forEach((n) => n.replaceWith(...n.childNodes));
    node.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((attr) => {
        if (!(n.tagName === 'A' && attr.name === 'href')) n.removeAttribute(attr.name);
      });
      if (n.tagName === 'A') n.setAttribute('href', absUrl(n.getAttribute('href')));
    });
    if (clean(node.textContent)) out.push(node);
  });
  return out;
}

function readConfig(root, component) {
  const sel = `react-component[data-component="${component}"]`;
  const rc = root.matches(sel) ? root : root.querySelector(`${sel}[data-config]`);
  if (!rc) return null;
  try {
    return JSON.parse(rc.getAttribute('data-config') || 'null');
  } catch (e) {
    return null;
  }
}

/** github-slugger style id, as generated by the EDS pipeline for headings. */
function slugify(text) {
  return clean(text).toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

function isTemplate(payload) {
  const name = payload && payload.template && payload.template.name;
  return !name || name === TEMPLATE || name === DETAIL_TEMPLATE || name === LANDING_TEMPLATE
    || name === DESIGN_TEMPLATE || name === HUB_TEMPLATE;
}

/** service-detail, service-landing and service-design (they use the detail-page steps too). */
function isDetail(payload) {
  const name = payload && payload.template && payload.template.name;
  return name === DETAIL_TEMPLATE || name === LANDING_TEMPLATE || name === DESIGN_TEMPLATE;
}

/** service-landing and service-design (the design pages use the landing-page steps too). */
function isLanding(payload) {
  const name = payload && payload.template && payload.template.name;
  return name === LANDING_TEMPLATE || name === DESIGN_TEMPLATE;
}

function isDesign(payload) {
  return Boolean(payload && payload.template && payload.template.name === DESIGN_TEMPLATE);
}

/** service-design: /content/jll-com-phoenix/country/amer/us/en/x.html points to /en-us/x (JLL's redirect). */
function mapAemSitePaths(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    let url;
    try { url = new URL(href, `${ORIGIN}/`); } catch (e) { return; }
    const isAbsolute = /^(https?:)?\/\//i.test(href);
    if (isAbsolute && !SITE_HOSTS.includes(url.hostname.toLowerCase())) return;
    if (!AEM_SITE_ROOT.test(url.pathname)) return;
    const path = url.pathname.replace(AEM_SITE_ROOT, '/en-us$1').replace(/\/$/, '');
    a.setAttribute('href', `${path}${url.search}${url.hash}`);
  });
}

/** service-landing: section heading (config titles = lines of one title) -> H2. */
function convertSectionHeadings(document, root) {
  root.querySelectorAll('div.sectionheading').forEach((node) => {
    const cfg = readConfig(node, 'sectionheading');
    const lines = (cfg && Array.isArray(cfg.titles) ? cfg.titles : [])
      .map((t) => clean(decodeHtml(document, t).textContent)).filter(Boolean);
    const rendered = node.querySelector('h1, h2, h3');
    const title = lines.length ? lines.join(' ') : clean(rendered && rendered.textContent);
    if (!title) {
      node.remove();
      return;
    }
    const h2 = document.createElement('h2');
    h2.textContent = title;
    node.replaceChildren(h2);
  });
}

function pinEmptyLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    if (clean(a.textContent) || a.querySelector('img, picture, video')) return;
    const parent = a.parentElement;
    if (!parent || parent.hasAttribute(PIN_HREF)) return;
    parent.setAttribute(PIN_HREF, a.getAttribute('href'));
    const label = a.getAttribute('aria-label');
    if (label) parent.setAttribute(PIN_LABEL, label);
  });
}

/**
 * Brightcove players below the fold only initialize (poster, video title) once scrolled into
 * view. Scroll each video component into view and wait briefly for its poster.
 * Returns a promise; the import script awaits the preprocess hook.
 */
async function revealVideos(root, detail = false) {
  const win = root.ownerDocument && root.ownerDocument.defaultView;
  if (!win || typeof win.scrollTo !== 'function') return;
  const configOf = (host) => (host.querySelector('react-component[data-config]') || { getAttribute: () => '' }).getAttribute('data-config') || '';
  const hosts = [...root.querySelectorAll('div.banner, div.hero, div.carouselsingledouble')]
    .filter((host) => /"(mediaType"\s*:\s*"video|withVideo"\s*:\s*true)/.test(configOf(host)));
  if (detail) {
    hosts.push(...[...root.querySelectorAll('div.featuredtile')].filter((host) => /"videoPlayer"\s*:\s*"\d+/.test(configOf(host))));
  }
  const wait = (ms) => new Promise((resolve) => { win.setTimeout(resolve, ms); });
  for (const host of hosts) {
    host.scrollIntoView({ block: 'center' });
    const start = Date.now();
    while (Date.now() - start < 6000) {
      const video = host.querySelector('video[poster]');
      const title = host.querySelector('.vjs-dock-title');
      if (video && video.getAttribute('poster') && (!host.querySelector('video-js') || (title && clean(title.textContent)))) break;
      await wait(250);
    }
  }
  win.scrollTo(0, 0);
}

function removeEmptyComponents(root, detail = false) {
  root.querySelectorAll('div.banner.aem-GridColumn').forEach((banner) => {
    const cfg = readConfig(banner, 'banner');
    let empty = !cfg || !cfg.bannerType;
    if (detail && !empty && cfg.bannerType === 'message') {
      empty = !clean(cfg.messageTitle) && !clean(cfg.messageDescription) && !clean(cfg.messageButtonTitle);
    }
    if (detail && !empty && cfg.bannerType === 'fullwidthmessage') {
      empty = !clean(cfg.fullWidthMessageTitle) && !clean(cfg.label);
    }
    if (empty || cfg.hideBanner === true || cfg.hideBanner === 'true') banner.remove();
  });
  root.querySelectorAll('div.jumppoint.aem-GridColumn').forEach((jp) => {
    const cfg = readConfig(jp, 'jumppoint');
    const hasLinks = cfg && Array.isArray(cfg.destinations) && cfg.destinations.length;
    if (!hasLinks && !clean(jp.textContent)) jp.remove();
  });
  root.querySelectorAll('div.accordion.aem-GridColumn').forEach((acc) => {
    const cfg = readConfig(acc, 'accordion');
    const hasItems = cfg && Array.isArray(cfg.accordionItems) && cfg.accordionItems.length;
    if (!hasItems && !clean(acc.textContent)) acc.remove();
  });
}

function normalizeEditorials(document, root, detail = false) {
  root.querySelectorAll('div.editorial.aem-GridColumn').forEach((editorial) => {
    const cfg = readConfig(editorial, 'editorial');
    const nodes = [];
    const renderedTitle = editorial.querySelector('h1, h2, h3');
    const title = cfg && cfg.title ? clean(decodeHtml(document, cfg.title).textContent) : clean(renderedTitle && renderedTitle.textContent);
    let h2 = null;
    if (title) {
      h2 = document.createElement('h2');
      h2.textContent = title;
      nodes.push(h2);
    }
    if (cfg && cfg.text) {
      nodes.push(...richParagraphs(document, decodeHtml(document, cfg.text), detail));
    } else {
      [...editorial.querySelectorAll('p')].forEach((p) => {
        if (!clean(p.textContent)) return;
        const copy = document.createElement('p');
        copy.textContent = clean(p.textContent);
        nodes.push(copy);
      });
    }
    let next = editorial.nextElementSibling;
    while (next && next.tagName !== 'DIV') next = next.nextElementSibling;
    if (h2 && next && next.matches('div.eloquaform')) {
      h2.setAttribute(CONTACT_MARK, (cfg && cfg.anchorId) || 'contact');
    }
    if (!nodes.length) {
      editorial.remove();
      return;
    }
    editorial.replaceChildren(...nodes);
  });
}

function ctaParagraph(document, label, href) {
  if (!clean(label) || !href) return null;
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = absUrl(href);
  a.textContent = clean(label);
  p.append(a);
  return p;
}

/** service-detail: full-width message banner -> statement paragraph + CTA (section style "statement"). */
function convertFullWidthMessages(document, root) {
  root.querySelectorAll('div.banner.aem-GridColumn').forEach((banner) => {
    const cfg = readConfig(banner, 'banner');
    if (!cfg || cfg.bannerType !== 'fullwidthmessage') return;
    const nodes = [];
    const title = clean(decodeHtml(document, cfg.fullWidthMessageTitle).textContent);
    if (title) {
      const p = document.createElement('p');
      p.textContent = title;
      nodes.push(p);
    }
    const cta = ctaParagraph(document, cfg.label || cfg.accessibilityLabel, cfg.url);
    if (cta) nodes.push(cta);
    banner.replaceChildren(...nodes);
    banner.setAttribute(STYLE_MARK, 'statement');
  });
}

/** service-detail: secondary navigation -> list of in-page links (section style "link-bar"). */
function convertSecondaryNav(document, root) {
  root.querySelectorAll('div.secondarynavigation').forEach((nav) => {
    const cfg = readConfig(nav, 'secondarynavigation');
    const items = (cfg && Array.isArray(cfg.ctas) ? cfg.ctas : [])
      .map((c) => ({ label: clean(c.ctatitle || c.accessibilitylabel), href: c.ctaurl }))
      .filter((c) => c.label && c.href);
    if (!items.length) {
      nav.remove();
      return;
    }
    const ul = document.createElement('ul');
    items.forEach(({ label, href }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = label;
      li.append(a);
      ul.append(li);
    });
    nav.replaceChildren(ul);
    nav.setAttribute(STYLE_MARK, 'link-bar');
  });
}

/**
 * service-detail: anchorId of each component -> generated id of its heading (rendered
 * H1 / H2, else the config title). Kept as JSON on the root until afterTransform.
 */
function collectAnchors(document, root) {
  const anchors = {};
  // repeated heading texts get "-1", "-2", ... ids (github-slugger), counted over the
  // component titles (H1 / H2) in page order
  const seen = {};
  const ids = new Map();
  root.querySelectorAll('h1, h2').forEach((h) => {
    const base = slugify(h.textContent);
    if (!base) return;
    const n = seen[base] || 0;
    seen[base] = n + 1;
    ids.set(h, n ? `${base}-${n}` : base);
  });
  root.querySelectorAll('react-component[data-config]').forEach((rc) => {
    let cfg;
    try { cfg = JSON.parse(rc.getAttribute('data-config') || 'null'); } catch (e) { cfg = null; }
    const id = cfg && clean(cfg.anchorId);
    if (!id || anchors[id]) return;
    const host = rc.closest('div.aem-GridColumn') || rc;
    const heading = host.querySelector('h1, h2');
    const titleSrc = (heading && heading.textContent) || cfg.title || cfg.maintitle || cfg.accordiontile || '';
    const slug = (heading && ids.get(heading)) || slugify(decodeHtml(document, titleSrc).textContent);
    if (slug) anchors[id] = slug;
  });
  // the contact heading: editorial directly before the eloqua form
  const contact = [...root.querySelectorAll('div.editorial.aem-GridColumn')].find((ed) => {
    let next = ed.nextElementSibling;
    while (next && next.tagName !== 'DIV') next = next.nextElementSibling;
    return next && next.matches('div.eloquaform');
  });
  const contactHeading = contact && contact.querySelector('h1, h2');
  if (contactHeading && ids.get(contactHeading)) anchors[CONTACT_KEY] = ids.get(contactHeading);
  if (Object.keys(anchors).length) root.setAttribute(ANCHORS_MARK, JSON.stringify(anchors));
}

function readAnchors(root) {
  try { return JSON.parse(root.getAttribute(ANCHORS_MARK) || 'null'); } catch (e) { return null; }
}

function rewriteComponentAnchors(root, pageUrl) {
  const anchors = readAnchors(root);
  if (!anchors) return;
  const normalize = (p) => p.replace(/\.html?$/i, '').replace(/\/$/, '');
  let pagePath = '';
  try { pagePath = normalize(new URL(pageUrl).pathname); } catch (e) { /* no page url */ }
  root.querySelectorAll('a[href*="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    let url;
    try { url = new URL(href, pageUrl || `${ORIGIN}/`); } catch (e) { return; }
    const target = anchors[url.hash.replace(/^#/, '')];
    if (!target) return;
    // authored as "#id", "/#id" (site root) or this page's own path
    const samePage = href.startsWith('#') || /^\/#/.test(href) || (pagePath && normalize(url.pathname) === pagePath);
    if (samePage) a.setAttribute('href', `#${target}`);
  });
}

function rewriteContactAnchors(root, pageUrl, contactId = '') {
  const heading = root.querySelector(`[${CONTACT_MARK}]`);
  if (!heading) return;
  const anchors = new Set(CONTACT_ANCHORS);
  anchors.add(heading.getAttribute(CONTACT_MARK));
  const id = contactId || slugify(heading.textContent);
  if (!id) return;
  const normalize = (p) => p.replace(/\.html?$/i, '').replace(/\/$/, '');
  let pagePath = '';
  try { pagePath = normalize(new URL(pageUrl).pathname); } catch (e) { /* no page url */ }
  root.querySelectorAll('a[href*="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    let url;
    try { url = new URL(href, pageUrl || `${ORIGIN}/`); } catch (e) { return; }
    if (!anchors.has(url.hash.replace(/^#/, ''))) return;
    const samePage = href.startsWith('#') || (pagePath && normalize(url.pathname) === pagePath);
    if (samePage) a.setAttribute('href', `#${id}`);
  });
}

function relativizeLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    const isAbsolute = /^(https?:)?\/\//i.test(href);
    const isRootRelative = href.startsWith('/') && !href.startsWith('//');
    if (!isAbsolute && !isRootRelative) return;
    let url;
    try { url = new URL(href, `${ORIGIN}/`); } catch (e) { return; }
    if (isAbsolute && !SITE_HOSTS.includes(url.hostname.toLowerCase())) return;
    if (!SITE_LOCALE.test(url.pathname)) return;
    const path = url.pathname.replace(/\.html?$/i, '');
    a.setAttribute('href', `${path}${url.search}${url.hash}`);
  });
}

export default function transform(hookName, element, payload) {
  if (!isTemplate(payload)) return;
  const document = element.ownerDocument;

  if (hookName === 'preprocess') {
    // async: the import script awaits the returned promise before the importer runs
    return revealVideos(element, isDetail(payload)).catch(() => {}).then(() => pinEmptyLinks(element));
  }

  const detail = isDetail(payload);

  if (hookName === 'beforeTransform') {
    element.querySelectorAll('div.spacer, div.separator, div.ghost').forEach((n) => n.remove());
    if (detail) collectAnchors(document, element);
    removeEmptyComponents(element, detail);
    if (detail) {
      convertFullWidthMessages(document, element);
      convertSecondaryNav(document, element);
    }
    if (isLanding(payload)) convertSectionHeadings(document, element);
    normalizeEditorials(document, element, detail);
  }

  if (hookName === 'afterTransform') {
    const pageUrl = (payload && payload.params && payload.params.originalURL) || (payload && payload.url) || '';
    if (detail) rewriteComponentAnchors(element, pageUrl);
    rewriteContactAnchors(element, pageUrl, detail ? ((readAnchors(element) || {})[CONTACT_KEY] || '') : '');
    if (isDesign(payload)) mapAemSitePaths(element);
    relativizeLinks(element);
    element.querySelectorAll(`[${PIN_HREF}], [${PIN_LABEL}], [${CONTACT_MARK}]`).forEach((n) => {
      n.removeAttribute(PIN_HREF);
      n.removeAttribute(PIN_LABEL);
      n.removeAttribute(CONTACT_MARK);
    });
    if (detail) {
      element.removeAttribute(ANCHORS_MARK);
      element.querySelectorAll(`[${STYLE_MARK}]`).forEach((n) => n.removeAttribute(STYLE_MARK));
    }
  }
}
