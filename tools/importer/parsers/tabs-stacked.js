/* eslint-disable */
/* global WebImporter */

/**
 * Parser: tabs-stacked (JLL "Explore a brighter way" accordion carousel).
 *
 * Source: div.accordion-carousel > react-component[data-component="accordion-carousel"].
 * The panels' cards only render after a click, so the content is read from the
 * component's data-config JSON:
 *   { multiItem: { title, description, singleItemList: [ { title, description,
 *     tiles: [ { eyebrow, title, description, ctaLink, ariaLabel, imageUrl, imageAlt } ] } ] } }
 * Fallback: rendered .carousel-accordion-slide cards + nav button labels.
 *
 * Output (section-based tabs, see blocks/tabs-stacked/README.md):
 *   <h2>Explore a brighter way</h2> <p>intro</p>      (section default content, kept in place)
 *   [tabs-stacked]                                    (block name only)
 *   for each panel:
 *     <hr>
 *     <p>panel description</p>
 *     [cards-eyebrow] one row per tile: image | eyebrow <p>, <h3>, description <p>, link
 *     [Section Metadata] Tab ID = kebab-case(panel title), Tab Title = panel title
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

function decodeText(document, str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.innerHTML = String(str);
  let text = div.textContent;
  if (/<[a-z/]/i.test(text)) {
    div.innerHTML = text;
    text = div.textContent;
  }
  return clean(text);
}

function toKebab(text) {
  return clean(text).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function el(document, tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function panelsFromConfig(document, config) {
  const multi = config && config.multiItem;
  if (!multi || !Array.isArray(multi.singleItemList) || !multi.singleItemList.length) return null;
  return {
    title: decodeText(document, multi.title),
    description: decodeText(document, multi.description),
    panels: multi.singleItemList.map((item) => ({
      title: decodeText(document, item.title),
      description: decodeText(document, item.description),
      tiles: (item.tiles || []).map((tile) => ({
        image: tile.imageUrl || '',
        alt: tile.imageDecorative ? '' : decodeText(document, tile.imageAlt),
        eyebrow: decodeText(document, tile.eyebrow),
        title: decodeText(document, tile.title),
        description: decodeText(document, tile.description),
        link: tile.ctaLink || '',
        linkText: decodeText(document, tile.ariaLabel),
      })),
    })),
  };
}

function panelsFromDom(root) {
  const navButtons = [...root.querySelectorAll('.carousel-navigation-wrapper nav button')];
  const slides = [...root.querySelectorAll('.swiper-slide')]
    .filter((s) => !s.classList.contains('swiper-slide-duplicate'));
  if (!navButtons.length && !slides.length) return null;
  const count = Math.max(navButtons.length, slides.length);
  const panels = [];
  for (let i = 0; i < count; i += 1) {
    const btn = navButtons[i];
    const labelEl = btn && (btn.querySelector('span[id$="-label"]') || btn.querySelector('span'));
    const slide = slides[i];
    const tiles = [];
    if (slide) {
      const row = slide.querySelector('.carousel-accordion-slide');
      const cols = row ? [...row.children] : [];
      cols.forEach((col) => {
        const card = col.querySelector('.carousel-accordion-card');
        if (!card) return;
        const img = col.querySelector('img');
        const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
        const paras = [...card.querySelectorAll('p')];
        const eyebrow = paras.find((p) => heading && (p.compareDocumentPosition(heading) & 4));
        const desc = paras.find((p) => heading && (heading.compareDocumentPosition(p) & 4));
        const link = card.querySelector('a[href]');
        tiles.push({
          image: img ? img.getAttribute('src') || '' : '',
          alt: img ? img.getAttribute('alt') || '' : '',
          eyebrow: eyebrow ? clean(eyebrow.textContent) : '',
          title: heading ? clean(heading.textContent) : '',
          description: desc ? clean(desc.textContent) : '',
          link: link ? link.getAttribute('href') : '',
          linkText: link ? clean(link.getAttribute('aria-label')) : '',
        });
      });
    }
    panels.push({
      title: labelEl ? clean(labelEl.textContent) : `Tab ${i + 1}`,
      description: '',
      tiles,
    });
  }
  return { title: '', description: '', panels };
}

function buildCardsBlock(document, tiles) {
  const cells = tiles.map((tile) => {
    let imageCell = '';
    if (tile.image) {
      const img = document.createElement('img');
      img.src = absUrl(tile.image);
      img.alt = tile.alt || '';
      imageCell = img;
    }
    const content = [];
    if (tile.eyebrow) content.push(el(document, 'p', tile.eyebrow));
    if (tile.title) content.push(el(document, 'h3', tile.title));
    if (tile.description) content.push(el(document, 'p', tile.description));
    if (tile.link) {
      const p = document.createElement('p');
      const a = el(document, 'a', tile.linkText || 'Read more');
      a.href = absUrl(tile.link);
      p.append(a);
      content.push(p);
    }
    return [imageCell, content];
  });
  return WebImporter.Blocks.createBlock(document, { name: 'cards-eyebrow', cells });
}

export default function parse(element, { document }) {
  const root = element.closest('div.accordion-carousel') || element;
  if (!root.parentNode) return;

  const data = panelsFromConfig(document, readConfig(root, 'accordion-carousel')) || panelsFromDom(root);
  if (!data || !data.panels.length) return;

  // Section default content: heading + intro paragraph (prefer the rendered nodes)
  const nodes = [];
  const headingEl = root.querySelector('.carousel-navigation-wrapper h2, h2');
  const headingText = headingEl ? clean(headingEl.textContent) : data.title;
  let introText = data.description;
  if (headingEl) {
    const next = headingEl.nextElementSibling;
    if (next && next.tagName === 'P' && clean(next.textContent)) introText = clean(next.textContent);
  }
  if (headingText) nodes.push(el(document, 'h2', headingText));
  if (introText) nodes.push(el(document, 'p', introText));

  const cells = [];
  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-stacked', cells });
  nodes.push(block);

  const usedIds = new Set();
  data.panels.forEach((panel, idx) => {
    nodes.push(document.createElement('hr'));
    if (panel.description) nodes.push(el(document, 'p', panel.description));
    if (panel.tiles.length) nodes.push(buildCardsBlock(document, panel.tiles));

    const title = panel.title || `Tab ${idx + 1}`;
    let id = toKebab(title) || `tab-${idx + 1}`;
    while (usedIds.has(id)) id = `${id}-${idx + 1}`;
    usedIds.add(id);
    nodes.push(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: [['Tab ID', id], ['Tab Title', title]],
    }));
  });

  root.replaceWith(...nodes);
}
