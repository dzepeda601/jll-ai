/* eslint-disable */
/* global WebImporter */

/**
 * Parser: carousel-split (JLL "More to explore" two-panel feature tile carousel).
 *
 * Source: div.carouselsingledouble > react-component[data-component="carouselsingledouble"].
 * Preferred input is the data-config JSON:
 *   { title, tiles: [ { eyebrow, title, description (entity-encoded HTML), ctaLink, ctaTitle,
 *     imageUrl, brightcoveVideo } ] }
 * Fallback: rendered .swiper-wrapper > .swiper-slide tiles.
 *
 * Output:
 *   <h2>More to explore</h2>   (section default content, placed BEFORE the block)
 *   [carousel-split] one row per slide:
 *     cell 1 image (Brightcove video tiles have no .mp4 / poster on the page, so the cell
 *            holds the tile image if one exists, otherwise it stays empty)
 *     cell 2 optional eyebrow <p>, <h3> title, description, CTA link
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

/** Visible text without material-symbol ligature spans (e.g. "arrow_forward"). */
function visibleText(node) {
  const copy = node.cloneNode(true);
  copy.querySelectorAll('span').forEach((span) => {
    if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean(span.textContent))) span.remove();
  });
  return clean(copy.textContent);
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

function slidesFromConfig(document, config) {
  if (!config || !Array.isArray(config.tiles) || !config.tiles.length) return null;
  return {
    title: clean(decodeHtml(document, config.title).textContent),
    slides: config.tiles.map((tile) => ({
      image: tile.imageUrl || '',
      alt: tile.carouselNotDecorativeImage ? clean(decodeHtml(document, tile.imageAlt || tile.title).textContent) : '',
      eyebrow: clean(decodeHtml(document, tile.eyebrow).textContent),
      title: clean(decodeHtml(document, tile.title).textContent),
      description: richParagraphs(document, decodeHtml(document, tile.description)),
      ctaLabel: clean(decodeHtml(document, tile.ctaTitle).textContent),
      ctaUrl: tile.ctaLink || '',
    })),
  };
}

function slidesFromDom(document, root) {
  const slideEls = [...root.querySelectorAll('.swiper-wrapper > .swiper-slide')]
    .filter((s) => !s.classList.contains('swiper-slide-duplicate'));
  if (!slideEls.length) return null;
  const titleEl = [...root.querySelectorAll('h2')].find((h) => !h.closest('.swiper-slide'));
  return {
    title: titleEl ? clean(titleEl.textContent) : '',
    slides: slideEls.map((slide) => {
      const img = slide.querySelector('img');
      const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
      const eyebrow = heading && heading.previousElementSibling && heading.previousElementSibling.tagName === 'P'
        ? heading.previousElementSibling : null;
      const desc = heading ? heading.nextElementSibling : null;
      const links = [...slide.querySelectorAll('a[href]')].filter((a) => !desc || !desc.contains(a));
      const cta = links[links.length - 1];
      return {
        image: img ? img.getAttribute('src') || '' : '',
        alt: img ? img.getAttribute('alt') || '' : '',
        eyebrow: eyebrow ? clean(eyebrow.textContent) : '',
        title: heading ? clean(heading.textContent) : '',
        description: desc ? richParagraphs(document, desc) : [],
        ctaLabel: cta ? visibleText(cta) : '',
        ctaUrl: cta ? cta.getAttribute('href') : '',
      };
    }),
  };
}

function buildRow(document, slide) {
  let media = '';
  if (slide.image) {
    const img = document.createElement('img');
    img.src = absUrl(slide.image);
    img.alt = slide.alt || '';
    media = img;
  }
  const content = [];
  if (slide.eyebrow) {
    const p = document.createElement('p');
    p.textContent = slide.eyebrow;
    content.push(p);
  }
  if (slide.title) {
    const h3 = document.createElement('h3');
    h3.textContent = slide.title;
    content.push(h3);
  }
  content.push(...slide.description);
  if (slide.ctaUrl || slide.ctaLabel) {
    const p = document.createElement('p');
    if (slide.ctaUrl) {
      const a = document.createElement('a');
      a.href = absUrl(slide.ctaUrl);
      a.textContent = slide.ctaLabel || 'Read more';
      p.append(a);
    } else {
      p.textContent = slide.ctaLabel;
    }
    content.push(p);
  }
  return [media, content];
}

export default function parse(element, { document }) {
  if (!element.parentNode) return;
  // Both instance selectors (".swiper" and its wrapper) can match: skip a wrapper that
  // already holds the block produced from its inner .swiper.
  if (element.querySelector('table') && !element.querySelector('.swiper-slide')) return;

  const root = element.closest('div.carouselsingledouble') || element;
  const data = slidesFromConfig(document, readConfig(root, 'carouselsingledouble')) || slidesFromDom(document, element);
  if (!data || !data.slides.length) return;

  // "dynamic" tiles (service landing pages) may hold only a ctaLink in data-config: their
  // image and text are rendered from the linked page, so take what is missing from the
  // rendered slide at the same position
  if (data.slides.some((s) => !s.image || !s.title)) {
    const rendered = slidesFromDom(document, root);
    if (rendered && rendered.slides.length === data.slides.length) {
      data.slides.forEach((slide, i) => {
        const r = rendered.slides[i];
        if (!slide.image && r.image && !/^data:/.test(r.image)) Object.assign(slide, { image: r.image, alt: r.alt });
        if (!slide.title && r.title) Object.assign(slide, { title: r.title, eyebrow: slide.eyebrow || r.eyebrow });
        if (!slide.description.length && r.description.length) slide.description = r.description;
      });
    }
  }

  // a slide with only a CTA (a dynamic tile whose linked page did not resolve: the source shows
  // a placeholder graphic) has nothing to show
  const slides = data.slides.filter((s) => s.image || s.title || s.eyebrow || s.description.length);
  if (!slides.length) return;
  const cells = slides.map((slide) => buildRow(document, slide));
  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-split', cells });

  if (data.title) {
    // "More to explore" stays section default content before the block
    const h2 = document.createElement('h2');
    h2.textContent = data.title;
    element.replaceWith(h2, block);
  } else {
    element.replaceWith(block);
  }
}
