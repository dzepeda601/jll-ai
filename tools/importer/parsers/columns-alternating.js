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

/* ------------------------------------------------------------------------------------
 * Service pages: side-content banners, div.banner > react-component[data-component="banner"]
 * with bannerType "sideContent" (only reached through the service-overview template's
 * instances; the homepage template selects div.featuredcardlist only).
 *
 *   data-config: { sideContentRightSideTitle, sideContentRightSideDescription (encoded HTML),
 *     sideContentLinkList: [ { sideContentLinkTitle, sideContentLinkUrl } ],
 *     sideContentRightLeftSideFlipOn ('true' = media left), mediaType 'image' | 'video',
 *     imagePath, imageAltText, videoAccountId, videoPlayer (Brightcove video id) }
 *
 * Consecutive side-content banners (e.g. five on /technology) become rows of one block;
 * the following banners are removed after being read. Row cells:
 *   text cell: H2, description (paragraphs / lists; headings re-levelled to H3), CTA links
 *   media cell: image, or a Brightcove player link (players.brightcove.net) with the rendered
 *               poster image, which the block turns into a click-to-play video
 * Cell order follows the source: media right by default, left when flip is on.
 * ---------------------------------------------------------------------------------- */

function bannerConfig(banner) {
  const cfg = readConfig(banner, 'banner');
  return cfg && cfg.bannerType === 'sideContent' ? cfg : null;
}

/** Rich description nodes: paragraphs, lists, sub-headings (as h3), inline links kept. */
function bannerDescription(document, container) {
  const out = [];
  const blocks = [...container.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6')]
    .filter((n) => !n.parentElement.closest('p, ul, ol, h1, h2, h3, h4, h5, h6'));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  sources.forEach((src) => {
    let tag = 'p';
    if (/^(UL|OL)$/.test(src.tagName)) tag = src.tagName.toLowerCase();
    else if (/^H[1-6]$/.test(src.tagName)) tag = 'h3';
    const node = document.createElement(tag);
    node.innerHTML = src.innerHTML;
    node.querySelectorAll('span, font').forEach((span) => span.replaceWith(...span.childNodes));
    node.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((attr) => {
        if (!(n.tagName === 'A' && attr.name === 'href')) n.removeAttribute(attr.name);
      });
      if (n.tagName === 'A') n.setAttribute('href', absUrl(n.getAttribute('href')));
    });
    // trim leading / trailing line breaks
    while (node.firstChild && node.firstChild.nodeName === 'BR') node.firstChild.remove();
    while (node.lastChild && node.lastChild.nodeName === 'BR') node.lastChild.remove();
    if (clean(node.textContent)) out.push(node);
  });
  return out;
}

function bannerMedia(document, banner, cfg) {
  const video = banner.querySelector('video-js[data-video-id], video[data-video-id]');
  const videoId = cfg.videoPlayer || (video && video.getAttribute('data-video-id'));
  if (cfg.mediaType === 'video' && videoId && cfg.videoAccountId) {
    const media = [];
    const posterEl = banner.querySelector('video[poster]');
    if (posterEl && posterEl.getAttribute('poster')) {
      const poster = document.createElement('img');
      poster.src = absUrl(posterEl.getAttribute('poster'));
      poster.alt = '';
      media.push(poster);
    }
    const url = `https://players.brightcove.net/${cfg.videoAccountId}/default_default/index.html?videoId=${videoId}`;
    const titleEl = banner.querySelector('.vjs-dock-title');
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = clean(titleEl && titleEl.textContent) || url;
    p.append(a);
    media.push(p);
    return media;
  }
  let src = cfg.imagePath || '';
  let alt = clean(cfg.imageAltText);
  if (!src) {
    const img = banner.querySelector('img');
    if (img) {
      src = img.getAttribute('src') || '';
      alt = clean(img.getAttribute('alt'));
    }
  }
  if (!src) return '';
  const img = document.createElement('img');
  img.src = absUrl(src);
  img.alt = alt;
  return img;
}

function bannerRow(document, banner, cfg) {
  const text = [];
  const title = clean(decodeHtml(document, cfg.sideContentRightSideTitle).textContent);
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    text.push(h2);
  }
  text.push(...bannerDescription(document, decodeHtml(document, cfg.sideContentRightSideDescription)));
  (cfg.sideContentLinkList || []).forEach((item) => {
    const label = clean(decodeHtml(document, item.sideContentLinkTitle).textContent);
    if (!item.sideContentLinkUrl && !label) return;
    const p = document.createElement('p');
    if (item.sideContentLinkUrl) {
      const a = document.createElement('a');
      a.href = absUrl(item.sideContentLinkUrl);
      a.textContent = label || absUrl(item.sideContentLinkUrl);
      p.append(a);
    } else {
      p.textContent = label;
    }
    text.push(p);
  });
  const media = bannerMedia(document, banner, cfg);
  const flip = cfg.sideContentRightLeftSideFlipOn === true || cfg.sideContentRightLeftSideFlipOn === 'true';
  return flip ? [media, text] : [text, media];
}

function parseSideContent(banner, document) {
  const rows = [];
  const consumed = [];
  let current = banner;
  while (current) {
    const cfg = bannerConfig(current);
    if (!cfg) break;
    rows.push(bannerRow(document, current, cfg));
    if (current !== banner) consumed.push(current);
    let next = current.nextElementSibling;
    while (next && next.tagName === 'HR') next = null; // a section break ends the run
    current = next && next.matches('div.banner') ? next : null;
  }
  if (!rows.length) return;
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-alternating', cells: rows });
  consumed.forEach((n) => n.remove());
  banner.replaceWith(block);
}

/* ------------------------------------------------------------------------------------
 * Service detail pages: featured tile, div.featuredtile > react-component[data-component=
 * "featuredtile"] (only reached through the service-detail template's instances).
 *
 *   data-config: { title, description, ctaLink, ariaLabel, featuredTileFlipAsset
 *     ('left' = media left), videoType 'bc', account, videoPlayer (Brightcove video id),
 *     imagePath / imageAltText (image tiles) }
 * One row: media cell (Brightcove player link + rendered poster, or image) and text cell
 * (H2, description, CTA link labelled with the aria label).
 * ---------------------------------------------------------------------------------- */

function parseFeaturedTile(root, document) {
  const cfg = readConfig(root, 'featuredtile') || {};
  const text = [];
  const title = clean(decodeHtml(document, cfg.title).textContent);
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    text.push(h2);
  }
  text.push(...bannerDescription(document, decodeHtml(document, cfg.description)));
  if (cfg.ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = absUrl(cfg.ctaLink);
    a.textContent = clean(cfg.ariaLabel) || title || absUrl(cfg.ctaLink);
    p.append(a);
    text.push(p);
  }
  if (!text.length) return;
  const media = bannerMedia(document, root, {
    mediaType: cfg.videoPlayer ? 'video' : 'image',
    videoPlayer: cfg.videoPlayer,
    videoAccountId: cfg.account,
    imagePath: cfg.imagePath,
    imageAltText: cfg.imageAltText,
  });
  const row = cfg.featuredTileFlipAsset === 'right' ? [text, media] : [media, text];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-alternating', cells: [row] });
  root.replaceWith(block);
}

/* ------------------------------------------------------------------------------------
 * Service landing pages: content block, div.contentblock > react-component[data-component=
 * "contentblock"] (only reached through the service-landing template's instances).
 *
 *   data-config: { title, description (encoded HTML), image: { imageUrl, imageAlt },
 *                  primaryLink: { label, url, ariaLabel } }
 * One row: image cell and text cell (H2, description, link), image first as on the source.
 * ---------------------------------------------------------------------------------- */

function parseContentBlock(root, document) {
  const cfg = readConfig(root, 'contentblock') || {};
  const renderedTitle = root.querySelector('h1, h2, h3');
  const img = root.querySelector('img');
  const link = cfg.primaryLink || {};
  const card = {
    image: (cfg.image && cfg.image.imageUrl) || (img && img.getAttribute('src')),
    alt: (cfg.image && cfg.image.imageAlt) || (img && img.getAttribute('alt')) || '',
    eyebrow: '',
    title: clean(decodeHtml(document, cfg.title).textContent) || clean(renderedTitle && renderedTitle.textContent),
    description: richParagraphs(document, decodeHtml(document, cfg.description)),
    links: link.url ? [{ label: clean(link.label || link.ariaLabel), url: link.url }] : [],
    imageFirst: true,
  };
  if (!card.title && !card.description.length) return;
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-alternating', cells: [buildRow(document, card)] });
  root.replaceWith(block);
}

/**
 * Service design pages (service-design template only): "colorCards" featured cards
 * (featuredCardType colorCards) add a subDescription paragraph and keep the image on the
 * right of every row (no alternation).
 */
function applyColorCards(document, config, cards) {
  const source = (config && Array.isArray(config.featuredCards)) ? config.featuredCards : [];
  if (source.length !== cards.length || !source.every((c) => c.featuredCardType === 'colorCards')) return;
  cards.forEach((card, i) => {
    card.description.push(...richParagraphs(document, decodeHtml(document, source[i].subDescription)));
    card.imageFirst = false;
  });
}

export default function parse(element, { document, params }) {
  const templateName = params && params.targets && params.targets.template && params.targets.template.name;
  const contentBlock = element.closest('div.contentblock');
  if (contentBlock) {
    if (contentBlock.parentNode) parseContentBlock(contentBlock, document);
    return;
  }
  const tile = element.closest('div.featuredtile');
  if (tile) {
    if (tile.parentNode) parseFeaturedTile(tile, document);
    return;
  }
  const banner = element.closest('div.banner');
  if (banner && bannerConfig(banner)) {
    if (banner.parentNode) parseSideContent(banner, document);
    return;
  }
  const root = element.closest('div.featuredcardlist') || element;
  if (!root.parentNode) return;

  const config = readConfig(root, 'featuredcardlist');
  const fromConfig = cardsFromConfig(document, config);
  const cards = fromConfig || cardsFromDom(document, root);
  if (!cards || !cards.length) return;
  if (fromConfig && templateName === 'service-design') applyColorCards(document, config, cards);

  const cells = cards.map((card) => buildRow(document, card));
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-alternating', cells });
  root.replaceWith(block);
}
