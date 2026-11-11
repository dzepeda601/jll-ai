/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-eyebrow (JLL accordion-carousel tile row).
 *
 * On the homepage every .carousel-accordion-slide lives inside the
 * "Explore a brighter way" accordion carousel, whose panels (and their
 * cards-eyebrow blocks) are emitted by the tabs-stacked parser from the
 * component's data-config. To avoid duplicate cards this parser leaves any
 * slide inside div.accordion-carousel untouched — tabs-stacked replaces the
 * whole component.
 *
 * Standalone .carousel-accordion-slide rows (outside an accordion carousel)
 * are converted here: one row per card.
 *   cell 1: image | cell 2: eyebrow <p>, <h3> title, description <p>, link
 */

const ORIGIN = 'https://www.jll.com';

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

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function el(document, tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function cardRow(document, col) {
  const card = col.querySelector('.carousel-accordion-card') || col;
  const img = col.querySelector('img');
  const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
  const paras = [...card.querySelectorAll('p')];
  // eyebrow = paragraph before the heading, description = paragraph after it
  const eyebrow = heading ? paras.find((p) => p.compareDocumentPosition(heading) & 4) : null;
  const desc = heading ? paras.find((p) => heading.compareDocumentPosition(p) & 4) : paras[0];
  const link = card.querySelector('a[href]');

  let imageCell = '';
  if (img && img.getAttribute('src')) {
    const image = document.createElement('img');
    image.src = absUrl(img.getAttribute('src'));
    image.alt = img.getAttribute('alt') || '';
    imageCell = image;
  }

  const content = [];
  if (eyebrow && clean(eyebrow.textContent)) content.push(el(document, 'p', clean(eyebrow.textContent)));
  if (heading) content.push(el(document, 'h3', clean(heading.textContent)));
  if (desc && clean(desc.textContent)) content.push(el(document, 'p', clean(desc.textContent)));
  if (link) {
    const p = document.createElement('p');
    const a = el(document, 'a', clean(link.getAttribute('aria-label')) || 'Read more');
    a.href = absUrl(link.getAttribute('href'));
    p.append(a);
    content.push(p);
  }
  return content.length ? [imageCell, content] : null;
}

/* ------------------------------------------------------------------------------------
 * Service pages: div.dynamiclist > react-component[data-component="dynamiclist"]
 * (only reached through the service-overview template's instances; the homepage
 * template never selects a dynamiclist, so its output is unchanged).
 *
 *   data-config: { title, titleCtaPath, hideTitle, listType: 'tile' | 'card',
 *                  cardTileType: 'contentService' | 'property', pageList: [ { title,
 *                  description, ctaLink } ] }
 *   - listType 'tile' -> cards-eyebrow (tiles): text-only rows, one cell:
 *       H3, description, optional tag links, link. Items come from data-config.pageList
 *       (curated list, all items) or, for query-driven tiles, from the rendered tiles.
 *   - listType 'card' -> cards-eyebrow: image | eyebrow, H3, details, link. Query-driven
 *       (articles, property listings): a static snapshot of the rendered cards.
 *   The list title is section default content (H2, linked when titleCtaPath is set)
 *   placed before the block. Card overlay links are empty <a> elements that the importer
 *   strips before transform; the service-overview cleanup preprocess pins their href and
 *   aria-label on the parent as data-excat-href / data-excat-label.
 * ---------------------------------------------------------------------------------- */

const PIN_HREF = 'data-excat-href';
const PIN_LABEL = 'data-excat-label';

function decodeHtml(document, str) {
  const div = document.createElement('div');
  if (!str) return div;
  div.innerHTML = String(str);
  if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
  div.querySelectorAll('script, style').forEach((n) => n.remove());
  return div;
}

function readDynamicListConfig(root) {
  const rc = root.matches('react-component[data-component="dynamiclist"]')
    ? root
    : root.querySelector('react-component[data-component="dynamiclist"][data-config]');
  if (!rc) return null;
  try {
    return JSON.parse(rc.getAttribute('data-config') || 'null');
  } catch (e) {
    return null;
  }
}

/** Paragraphs of a (decoded) description, inline links kept. */
function descParagraphs(document, container) {
  const blocks = [...container.querySelectorAll('p')].filter((n) => !n.parentElement.closest('p'));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  return sources.map((src) => {
    const p = document.createElement('p');
    p.innerHTML = src.innerHTML;
    p.querySelectorAll('span, font, div').forEach((n) => n.replaceWith(...n.childNodes));
    p.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((attr) => {
        if (!(n.tagName === 'A' && attr.name === 'href')) n.removeAttribute(attr.name);
      });
      if (n.tagName === 'A') n.setAttribute('href', absUrl(n.getAttribute('href')));
    });
    return p;
  }).filter((p) => clean(p.textContent));
}

function linkPara(document, href, label) {
  const p = document.createElement('p');
  const a = el(document, 'a', clean(label) || absUrl(href));
  a.href = absUrl(href);
  p.append(a);
  return p;
}

/** Card link: pinned overlay link, else a real link that is not a tag link. */
function cardLink(card) {
  const pinned = card.matches(`[${PIN_HREF}]`) ? card : card.querySelector(`[${PIN_HREF}]`);
  if (pinned) return { href: pinned.getAttribute(PIN_HREF), label: pinned.getAttribute(PIN_LABEL) || '' };
  const a = [...card.querySelectorAll('a[href]')].find((x) => !x.closest('ul, [data-testid$="__tags"]'));
  return a ? { href: a.getAttribute('href'), label: a.getAttribute('aria-label') || clean(a.textContent) } : null;
}

function renderedItems(root) {
  const container = root.querySelector('.c-list-container') || root;
  const titled = [...container.querySelectorAll('h3')];
  // each item = the outermost grid column holding exactly one h3
  const items = [];
  titled.forEach((h3) => {
    let item = h3;
    while (item.parentElement && item.parentElement !== container
      && item.parentElement.querySelectorAll('h3').length === 1) item = item.parentElement;
    if (!items.includes(item)) items.push(item);
  });
  return items;
}

function tileRowsFromConfig(document, pageList) {
  return pageList.map((item) => {
    const title = clean(decodeHtml(document, item.title).textContent);
    const content = [];
    if (title) content.push(el(document, 'h3', title));
    content.push(...descParagraphs(document, decodeHtml(document, item.description)));
    if (item.ctaLink) content.push(linkPara(document, item.ctaLink, title));
    return content.length ? [content] : null;
  }).filter(Boolean);
}

function tileRowsFromDom(document, root) {
  return renderedItems(root).map((item) => {
    const h3 = item.querySelector('h3');
    const title = clean(h3 && h3.textContent);
    const content = [];
    if (title) content.push(el(document, 'h3', title));
    const desc = item.querySelector('.description, [data-testid$="__description"]');
    if (desc && clean(desc.textContent)) content.push(el(document, 'p', clean(desc.textContent)));
    const tags = [...item.querySelectorAll('ul a[href]')];
    if (tags.length) {
      const ul = document.createElement('ul');
      tags.forEach((tag) => {
        const li = document.createElement('li');
        const a = el(document, 'a', clean(tag.textContent));
        a.href = absUrl(tag.getAttribute('href'));
        li.append(a);
        ul.append(li);
      });
      content.push(ul);
    }
    const target = cardLink(item);
    if (target && target.href) content.push(linkPara(document, target.href, target.label || title));
    return content.length ? [content] : null;
  }).filter(Boolean);
}

function cardRowsFromDom(document, root) {
  return renderedItems(root).map((item) => {
    const h3 = item.querySelector('h3');
    const title = clean(h3 && h3.textContent);
    const img = item.querySelector('img');
    let imageCell = '';
    if (img && img.getAttribute('src') && !/^data:/.test(img.getAttribute('src'))) {
      const image = document.createElement('img');
      // some listing images are http:// (blocked as mixed content on the source): use https
      image.src = absUrl(img.getAttribute('src')).replace(/^http:\/\//i, 'https://');
      image.alt = img.getAttribute('alt') || '';
      imageCell = image;
    }
    const content = [];
    const eyebrow = item.querySelector('[data-testid$="__content-preheader"]')
      || [...item.querySelectorAll('p')].find((p) => h3 && (p.compareDocumentPosition(h3) & 4));
    if (eyebrow && clean(eyebrow.textContent)) content.push(el(document, 'p', clean(eyebrow.textContent)));
    if (title) content.push(el(document, 'h3', title));
    let details = [...item.querySelectorAll('[data-testid$="__content-body"], [data-testid$="__footer-text"]')];
    if (!details.length && h3) {
      // fallback: text blocks after the heading, outside the footer
      details = [...item.querySelectorAll('div.wrap-anywhere, div.text-sm')]
        .filter((d) => (h3.compareDocumentPosition(d) & 4) && !d.querySelector('div.wrap-anywhere, div.text-sm'));
    }
    details.forEach((d) => {
      if (clean(d.textContent)) content.push(el(document, 'p', clean(d.textContent)));
    });
    const target = cardLink(item);
    if (target && target.href) content.push(linkPara(document, target.href, target.label || title));
    return content.length ? [imageCell, content] : null;
  }).filter(Boolean);
}

function parseDynamicList(element, document) {
  const root = element.closest('div.dynamiclist') || element;
  if (!root.parentNode) return;
  const cfg = readDynamicListConfig(root) || {};

  const isTiles = cfg.listType ? cfg.listType === 'tile' : !!root.querySelector('.search-tile-card');
  let cells;
  if (isTiles) {
    cells = Array.isArray(cfg.pageList) && cfg.pageList.length
      ? tileRowsFromConfig(document, cfg.pageList)
      : tileRowsFromDom(document, root);
  } else {
    cells = cardRowsFromDom(document, root);
  }

  const out = [];
  const renderedTitle = root.querySelector('h2');
  const title = clean(decodeHtml(document, cfg.title).textContent) || clean(renderedTitle && renderedTitle.textContent);
  if (title && cfg.hideTitle !== true) {
    const h2 = document.createElement('h2');
    if (cfg.titleCtaPath) {
      const a = el(document, 'a', title);
      a.href = absUrl(cfg.titleCtaPath);
      h2.append(a);
    } else {
      h2.textContent = title;
    }
    out.push(h2);
  }
  if (cells.length) {
    out.push(WebImporter.Blocks.createBlock(document, {
      name: 'cards-eyebrow',
      variants: isTiles ? ['tiles'] : [],
      cells,
    }));
  }
  if (!out.length) return;
  root.replaceWith(...out);
}

/* ------------------------------------------------------------------------------------
 * Service detail pages: 2-column jump point ("Explore similar offerings"),
 * div.jumppoint > react-component[data-component="jumppoint"] (only reached through the
 * service-detail template's instances; service-overview maps jumppoints to
 * hero-photo-panel, the homepage has none).
 *
 *   data-config: { viewType: '2col', title, description (HTML), ctaTitle, ctaUrl,
 *                  secondaryCtaLabel, secondaryCtaUrl,
 *                  destinations: [ { title, description, url, accessibilityLabel } ] }
 * Output: H2, description paragraph(s) and CTA link paragraph(s) as section default
 * content, then cards-eyebrow (links): one row per destination, one cell:
 * H3 title, description, link. The section gets style "split" (sections transformer).
 * Fallback: rendered H2 / paragraphs / destination links.
 * ---------------------------------------------------------------------------------- */

function readJumppointConfig(root) {
  const rc = root.querySelector('react-component[data-component="jumppoint"][data-config]');
  if (!rc) return null;
  try {
    return JSON.parse(rc.getAttribute('data-config') || 'null');
  } catch (e) {
    return null;
  }
}

function parseJumppoint(element, document) {
  const root = element.closest('div.jumppoint') || element;
  if (!root.parentNode) return;
  const cfg = readJumppointConfig(root) || {};

  const out = [];
  const renderedTitle = root.querySelector('h2');
  const title = clean(decodeHtml(document, cfg.title).textContent) || clean(renderedTitle && renderedTitle.textContent);
  if (title) out.push(el(document, 'h2', title));
  out.push(...descParagraphs(document, decodeHtml(document, cfg.description)));
  // service-landing "golden-ratio" jump points name the first CTA primaryCtaLabel / primaryCtaUrl
  const primary = cfg.ctaUrl ? [cfg.ctaTitle, cfg.ctaUrl] : [cfg.primaryCtaLabel, cfg.primaryCtaUrl];
  [primary, [cfg.secondaryCtaLabel, cfg.secondaryCtaUrl]].forEach(([label, href]) => {
    if (clean(label) && href) out.push(linkPara(document, href, label));
  });

  let cells = [];
  if (Array.isArray(cfg.destinations) && cfg.destinations.length) {
    cells = cfg.destinations.map((d) => {
      const name = clean(decodeHtml(document, d.title).textContent);
      const content = [];
      if (name) content.push(el(document, 'h3', name));
      content.push(...descParagraphs(document, decodeHtml(document, d.description)));
      if (d.url) content.push(linkPara(document, d.url, name || d.accessibilityLabel));
      return content.length ? [content] : null;
    }).filter(Boolean);
  } else {
    cells = [...root.querySelectorAll('a[href]')]
      .filter((a) => a.querySelector('p') && a.nextElementSibling)
      .map((a) => {
        const name = clean(a.textContent).replace(/chevron_right$/, '').trim();
        const content = [el(document, 'h3', name)];
        const desc = clean(a.nextElementSibling.textContent);
        if (desc) content.push(el(document, 'p', desc));
        content.push(linkPara(document, a.getAttribute('href'), name));
        return [content];
      });
  }
  if (cells.length) {
    out.push(WebImporter.Blocks.createBlock(document, { name: 'cards-eyebrow', variants: ['links'], cells }));
  }
  if (!out.length) return;
  root.replaceWith(...out);
}

/**
 * Service design pages (service-design template only): the list's own CTA
 * (config ctaTitle / ctaUrl, e.g. "View all design client stories") becomes a link
 * paragraph after the cards. Called before parsing, while the list element still exists.
 */
function listCta(document, element) {
  const root = element.closest('div.dynamiclist') || element;
  const cfg = readDynamicListConfig(root) || {};
  if (!clean(cfg.ctaTitle) || !cfg.ctaUrl) return null;
  return linkPara(document, cfg.ctaUrl, cfg.ctaTitle);
}

/* ------------------------------------------------------------------------------------
 * Services hub (/en-us/services): div.search > react-component[data-component="search"]
 * (only reached through the services-hub template's instances). The search results are
 * a query-driven, paginated list: the services-hub transformer reads every results page
 * into div.search[data-excat-search-results] (JSON: href, title, description, image, alt);
 * the rendered first page is the fallback. -> cards-eyebrow (grid): image | H3,
 * description, link (labelled with the title). Category tags (search filter links) and
 * the keyword box are not part of the snapshot.
 * ---------------------------------------------------------------------------------- */

function searchResultItems(root) {
  try {
    const items = JSON.parse(root.getAttribute('data-excat-search-results') || 'null');
    if (Array.isArray(items) && items.length) return items;
  } catch (e) { /* fall back to the rendered cards */ }
  return [...root.querySelectorAll('.c-default-card')].map((card) => {
    const pinned = card.matches(`[${PIN_HREF}]`) ? card : card.querySelector(`[${PIN_HREF}]`);
    const link = card.querySelector('a[href]');
    const header = card.querySelector('.c-default-card__content-header');
    const body = card.querySelector('.c-default-card__content-body');
    const img = card.querySelector('.c-default-card__image img');
    return {
      href: (pinned && pinned.getAttribute(PIN_HREF)) || (link && link.getAttribute('href')) || '',
      title: clean(header && header.textContent) || clean(pinned && pinned.getAttribute(PIN_LABEL)),
      description: clean(body && body.textContent),
      image: img ? img.getAttribute('src') || '' : '',
      alt: img ? img.getAttribute('alt') || '' : '',
    };
  });
}

function parseSearchResults(element, document) {
  const root = element.closest('div.search') || element;
  if (!root.parentNode) return;
  const cells = searchResultItems(root).filter((item) => item.title && item.href).map((item) => {
    let imageCell = '';
    if (item.image) {
      const image = document.createElement('img');
      image.src = absUrl(item.image);
      image.alt = item.alt || '';
      imageCell = image;
    }
    const content = [el(document, 'h3', item.title)];
    if (item.description) content.push(el(document, 'p', item.description));
    content.push(linkPara(document, item.href, item.title));
    return [imageCell, content];
  });
  if (!cells.length) return;
  root.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'cards-eyebrow', variants: ['grid'], cells }));
}

export default function parse(element, { document, params }) {
  if (!element.parentNode) return;
  if (element.matches('div.search')) {
    parseSearchResults(element, document);
    return;
  }
  if (element.matches('div.jumppoint')) {
    parseJumppoint(element, document);
    return;
  }
  if (element.matches('div.dynamiclist, react-component[data-component="dynamiclist"]')) {
    const templateName = params && params.targets && params.targets.template && params.targets.template.name;
    const cta = templateName === 'service-design' ? listCta(document, element) : null;
    const marker = cta && document.createComment('excat-list-cta');
    if (marker) (element.closest('div.dynamiclist') || element).after(marker);
    parseDynamicList(element, document);
    if (marker) marker.replaceWith(cta);
    return;
  }
  // Owned by the tabs-stacked parser (reads all panels from data-config): no duplicates.
  if (element.closest('div.accordion-carousel, react-component[data-component="accordion-carousel"]')) return;

  const slide = element.matches('.carousel-accordion-slide')
    ? element
    : element.querySelector('.carousel-accordion-slide') || element;
  const cols = [...slide.children].filter((c) => c.querySelector('.carousel-accordion-card, h1, h2, h3, h4, h5, h6'));
  const cells = cols.map((col) => cardRow(document, col)).filter(Boolean);
  if (!cells.length) return;

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-eyebrow', cells });
  element.replaceWith(block);
}
