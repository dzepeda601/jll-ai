/* eslint-disable */
/* global WebImporter */

/**
 * Parser: columns-alternating (JLL featured card list).
 *
 * Source: div.featuredcardlist > react-component[data-component="featuredcardlist"].
 * Preferred input is the data-config JSON:
 *   { firstCardAssetAlignment: 'left'|'right', featuredCards: [ { eyebrow, title, description
 *     (entity-encoded HTML), image: { imageUrl, imageAlt }, links: [ { label, url } ] } ] }
 * The rendered CTA is a <button> without href, so the link target only exists in data-config.
 * Fallback: rendered article.featured-card rows; a CTA without a target stays plain text.
 *
 * Block contract (blocks/columns-alternating/README.md): one row per feature, 2 cells
 * (image-only cell + text cell: eyebrow <p>, <h2>, description, CTA link). Cell order
 * alternates per row to mirror the source (image left, right, left, ...).
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

/** Parse a data-config string that may hold entity-encoded HTML into a container element. */
function decodeHtml(document, str) {
  const div = document.createElement('div');
  if (!str) return div;
  div.innerHTML = String(str);
  if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
  div.querySelectorAll('script, style').forEach((n) => n.remove());
  return div;
}

/** Block-level paragraphs with inline links kept (absolute) and wrapper spans/attributes dropped. */
function richParagraphs(document, container) {
  const out = [];
  const blocks = [...container.querySelectorAll('p, ul, ol')].filter((n) => !n.parentElement.closest('p, ul, ol'));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  sources.forEach((src) => {
    const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : 'p';
    const node = document.createElement(tag);
    node.innerHTML = src.innerHTML;
    node.querySelectorAll('span').forEach((span) => span.replaceWith(...span.childNodes));
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
  const rc = (root.matches && root.matches(`react-component[data-component="${component}"]`))
    ? root
    : root.querySelector(`react-component[data-component="${component}"][data-config]`);
  if (!rc) return null;
  try {
    return JSON.parse(rc.getAttribute('data-config'));
  } catch (e) {
    return null;
  }
}

/** Visible text without material-symbol ligature spans (e.g. "arrow_forward"). */
function visibleText(node) {
  const copy = node.cloneNode(true);
  copy.querySelectorAll('span').forEach((span) => {
    if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean(span.textContent))) span.remove();
  });
  return clean(copy.textContent);
}

function cardsFromConfig(document, config) {
  if (!config || !Array.isArray(config.featuredCards) || !config.featuredCards.length) return null;
  const imageFirst = config.firstCardAssetAlignment !== 'right';
  return config.featuredCards.map((card, idx) => ({
    image: card.image && card.image.imageUrl,
    alt: (card.image && card.image.imageAlt) || '',
    eyebrow: clean(decodeHtml(document, card.eyebrow).textContent),
    title: clean(decodeHtml(document, card.title).textContent),
    description: richParagraphs(document, decodeHtml(document, card.description)),
    links: (card.links || []).map((l) => ({ label: clean(decodeHtml(document, l.label).textContent), url: l.url })),
    imageFirst: idx % 2 === 0 ? imageFirst : !imageFirst,
  }));
}

function cardsFromDom(document, root) {
  const articles = [...root.querySelectorAll('article.featured-card, .featured-card')]
    .filter((a, i, arr) => !arr.some((o) => o !== a && o.contains(a)));
  if (!articles.length) return null;
  return articles.map((article) => {
    const img = article.querySelector('.featured-card__media-container img, img');
    const eyebrow = article.querySelector('.featured-card__eyebrow');
    const heading = article.querySelector('.featured-card__title, h1, h2, h3');
    const desc = article.querySelector('.featured-card__description');
    const row = article.querySelector('.featured-card__row');
    const flipped = row && (row.classList.contains('featured-card__flipped') || row.classList.contains('flex-row-reverse'));
    const links = [...article.querySelectorAll('.featured-card__link')].map((wrap) => {
      const a = wrap.querySelector('a[href]');
      return { label: visibleText(a || wrap), url: a ? a.getAttribute('href') : '' };
    });
    return {
      image: img && img.getAttribute('src'),
      alt: img ? img.getAttribute('alt') || '' : '',
      eyebrow: eyebrow ? clean(eyebrow.textContent) : '',
      title: heading ? clean(heading.textContent) : '',
      description: desc ? richParagraphs(document, desc) : [],
      links,
      imageFirst: !flipped,
    };
  });
}

function buildRow(document, card) {
  let imageCell = '';
  if (card.image) {
    const img = document.createElement('img');
    img.src = absUrl(card.image);
    img.alt = card.alt;
    imageCell = img;
  }
  const text = [];
  if (card.eyebrow) {
    const p = document.createElement('p');
    p.textContent = card.eyebrow;
    text.push(p);
  }
  if (card.title) {
    const h2 = document.createElement('h2');
    h2.textContent = card.title;
    text.push(h2);
  }
  text.push(...card.description);
  card.links.forEach((link) => {
    if (!link.label && !link.url) return;
    const p = document.createElement('p');
    if (link.url) {
      const a = document.createElement('a');
      a.href = absUrl(link.url);
      a.textContent = link.label || absUrl(link.url);
      p.append(a);
    } else {
      // No link target in the source: keep the CTA text rather than inventing a URL
      p.textContent = link.label;
    }
    text.push(p);
  });
  return card.imageFirst ? [imageCell, text] : [text, imageCell];
}

export default function parse(element, { document }) {
  const root = element.closest('div.featuredcardlist') || element;
  if (!root.parentNode) return;

  const cards = cardsFromConfig(document, readConfig(root, 'featuredcardlist')) || cardsFromDom(document, root);
  if (!cards || !cards.length) return;

  const cells = cards.map((card) => buildRow(document, card));
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-alternating', cells });
  root.replaceWith(block);
}
