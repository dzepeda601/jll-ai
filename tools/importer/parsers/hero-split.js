/* eslint-disable */
/* global WebImporter */

/**
 * Parser: hero-split (JLL service page "golden ratio" hero).
 *
 * Source: div.hero > react-component[data-component="hero"]. Preferred input is data-config:
 *   { title, description (entity-encoded HTML), imagePath, imageAltText, withVideo,
 *     primaryCTATitle, primaryCTAUrl, secondaryCTATitle, secondaryCTAUrl }
 * Video heroes (withVideo) have no image: the rendered Brightcove poster is used instead.
 * Fallback: rendered h1 / description / img / CTA links.
 *
 * Block contract (blocks/hero-split/README.md):
 *   row 1: image
 *   row 2: H1, intro paragraph(s), CTA links (bold = primary, italic = secondary)
 * The description is intro text: headings in it (e.g. /technology's H3) become paragraphs.
 * heroStyle "sideImage" (service-detail pages: H1 on top, image left) adds the side-image
 * option; other hero styles (the overview pages' "goldenratio") keep the plain block.
 *
 * Service landing pages:
 *   heroStyle "creative2": { title (small eyebrow, e.g. "Services"), headline (the H1),
 *     description (lead paragraph), subDescription } -> eyebrow paragraph, H1, lead and
 *     sub paragraphs, CTAs; options side-image + bleed (image runs to the page edge).
 *   heroStyle "designServices": { title (large display eyebrow), headline (H1), description }
 *     -> same text cell; option stacked (eyebrow, full-width image, then H1 and text).
 *
 * Service design pages (service-design template only):
 *   heroStyle "designLanding": { title (the H1), withVideo, primaryCTA* } -> option stacked
 *     without eyebrow: full-width video poster, then H1 and CTA.
 */

const HEADLINE_STYLES = {
  creative2: ['side-image', 'bleed'],
  designServices: ['stacked'],
};

// hero styles whose config title is the H1 (no headline), by template
const TITLE_STYLES = {
  'service-design': { designLanding: ['stacked'] },
};

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
  const sel = `react-component[data-component="${component}"]`;
  const rc = root.matches(sel) ? root : root.querySelector(`${sel}[data-config]`);
  if (!rc) return null;
  try {
    return JSON.parse(rc.getAttribute('data-config') || 'null');
  } catch (e) {
    return null;
  }
}

/** Intro paragraphs: every block (p, h1-h6, div) becomes a <p>; links kept. */
function introParagraphs(document, container) {
  const blocks = [...container.querySelectorAll('p, h1, h2, h3, h4, h5, h6')]
    .filter((n) => !n.parentElement.closest('p, h1, h2, h3, h4, h5, h6'));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  return sources.map((src) => {
    const p = document.createElement('p');
    p.innerHTML = src.innerHTML;
    p.querySelectorAll('span, font').forEach((n) => n.replaceWith(...n.childNodes));
    p.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((attr) => {
        if (!(n.tagName === 'A' && attr.name === 'href')) n.removeAttribute(attr.name);
      });
      if (n.tagName === 'A') n.setAttribute('href', absUrl(n.getAttribute('href')));
    });
    return p;
  }).filter((p) => clean(p.textContent));
}

function ctaPara(document, label, href, wrapTag) {
  if (!clean(label) || !href) return null;
  const p = document.createElement('p');
  const wrap = document.createElement(wrapTag);
  const a = document.createElement('a');
  a.href = absUrl(href);
  a.textContent = clean(label);
  wrap.append(a);
  p.append(wrap);
  return p;
}

/** Visible text without material-symbol ligature spans (e.g. "arrow_forward"). */
function visibleText(node) {
  const copy = node.cloneNode(true);
  copy.querySelectorAll('span').forEach((span) => {
    if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean(span.textContent))) span.remove();
  });
  return clean(copy.textContent);
}

export default function parse(element, { document, params }) {
  const root = element.closest('div.hero') || element;
  if (!root.parentNode) return;
  const cfg = readConfig(root, 'hero') || {};
  const templateName = params && params.targets && params.targets.template && params.targets.template.name;
  const titleStyle = (TITLE_STYLES[templateName] || {})[cfg.heroStyle];

  // image: config image, else rendered image, else the video poster
  let src = cfg.imagePath || '';
  let alt = clean(cfg.imageAltText);
  if (!src) {
    const img = root.querySelector('img:not(video-js img)');
    const video = root.querySelector('video[poster]');
    if (img && img.getAttribute('src')) {
      src = img.getAttribute('src');
      alt = clean(img.getAttribute('alt'));
    } else if (video) {
      src = video.getAttribute('poster');
      alt = '';
    }
  }

  const renderedH1 = root.querySelector('h1');
  // landing heroes: the config title is an eyebrow and the headline is the H1
  const headlineStyle = HEADLINE_STYLES[cfg.heroStyle] && clean(decodeHtml(document, cfg.headline).textContent);
  const eyebrow = headlineStyle ? clean(decodeHtml(document, cfg.title).textContent) : '';
  const title = headlineStyle
    || clean(decodeHtml(document, cfg.title).textContent) || clean(renderedH1 && renderedH1.textContent);

  let intro = introParagraphs(document, decodeHtml(document, cfg.description));
  if (headlineStyle) intro.push(...introParagraphs(document, decodeHtml(document, cfg.subDescription)));
  if (!intro.length && renderedH1) {
    const block = renderedH1.closest('div.flex-col') || renderedH1.parentElement;
    intro = [...block.querySelectorAll('p')].map((p) => {
      const copy = document.createElement('p');
      copy.textContent = clean(p.textContent);
      return copy;
    }).filter((p) => p.textContent);
  }

  const ctas = [];
  const primary = ctaPara(document, cfg.primaryCTATitle, cfg.primaryCTAUrl, 'strong');
  const secondary = ctaPara(document, cfg.secondaryCTATitle, cfg.secondaryCTAUrl, 'em');
  if (primary || secondary) {
    if (primary) ctas.push(primary);
    if (secondary) ctas.push(secondary);
  } else {
    [...root.querySelectorAll('a[href]')].forEach((a) => {
      const testId = a.getAttribute('data-testid') || '';
      const wrap = /secondary/.test(testId) ? 'em' : 'strong';
      const p = ctaPara(document, visibleText(a), a.getAttribute('href'), wrap);
      if (p) ctas.push(p);
    });
  }

  const text = [];
  if (eyebrow) {
    const p = document.createElement('p');
    p.textContent = eyebrow;
    text.push(p);
  }
  if (title) {
    const h1 = document.createElement('h1');
    h1.textContent = title;
    text.push(h1);
  }
  text.push(...intro, ...ctas);
  if (!text.length) return;

  const cells = [];
  if (src) {
    const img = document.createElement('img');
    img.src = absUrl(src);
    img.alt = alt;
    cells.push([img]);
  }
  cells.push([text]);

  let variants = cfg.heroStyle === 'sideImage' ? ['side-image'] : [];
  if (headlineStyle) variants = HEADLINE_STYLES[cfg.heroStyle];
  else if (titleStyle) variants = titleStyle;
  const block = WebImporter.Blocks.createBlock(document, variants.length
    ? { name: 'hero-split', variants, cells }
    : { name: 'hero-split', cells });
  root.replaceWith(block);
}
