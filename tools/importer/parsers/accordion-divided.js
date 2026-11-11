/* eslint-disable */
/* global WebImporter */

/**
 * Parser: accordion-divided (JLL FAQ accordion and rotating tiles).
 *
 * Sources (preferred input is data-config; answers / tile bodies are collapsed in the DOM):
 *   div.accordion > react-component[data-component="accordion"]
 *     { accordiontile (section title), accordionItems: [ { title, content (encoded HTML) } ] }
 *   div.rotatingtile > react-component[data-component="rotatingtile"]
 *     { title, description, tiles: [ { title, description, bulletpoints: [ { bulletpoint } ],
 *       imagePath, imageAltText, imageDecorative, ctalink, ctatitle } ] }
 * Fallback: rendered h2, accordion-item h3 titles and any rendered content regions.
 *
 * Output (blocks/accordion-divided/README.md):
 *   <h2> (+ intro paragraphs)   section default content before the block
 *   [accordion-divided] one row per item: cell 1 title | cell 2 content
 *     (paragraphs, lists, links; rotating tiles put their image first in the content)
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

function sanitize(node) {
  node.querySelectorAll('span, font, div').forEach((n) => n.replaceWith(...n.childNodes));
  node.querySelectorAll('*').forEach((n) => {
    [...n.attributes].forEach((attr) => {
      if (!(n.tagName === 'A' && attr.name === 'href')) n.removeAttribute(attr.name);
    });
    if (n.tagName === 'A') n.setAttribute('href', absUrl(n.getAttribute('href')));
  });
  // empty list items / nested lists left over in the source answers
  [...node.querySelectorAll('li')].reverse().forEach((li) => { if (!clean(li.textContent)) li.remove(); });
  [...node.querySelectorAll('ul, ol')].reverse().forEach((list) => { if (!list.children.length) list.remove(); });
  while (node.firstChild && (node.firstChild.nodeName === 'BR' || (node.firstChild.nodeType === 3 && !clean(node.firstChild.textContent)))) node.firstChild.remove();
  while (node.lastChild && (node.lastChild.nodeName === 'BR' || (node.lastChild.nodeType === 3 && !clean(node.lastChild.textContent)))) node.lastChild.remove();
  return node;
}

/** Rich answer content: paragraphs, lists, sub-headings (as h4), inline formatting and links. */
function richContent(document, container) {
  const out = [];
  const blocks = [...container.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6, table')]
    .filter((n) => !n.parentElement.closest('p, ul, ol, h1, h2, h3, h4, h5, h6, table'));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  sources.forEach((src) => {
    let tag = 'p';
    if (/^(UL|OL)$/.test(src.tagName)) tag = src.tagName.toLowerCase();
    else if (/^H[1-6]$/.test(src.tagName)) tag = 'h4';
    if (src.tagName === 'TABLE') {
      // keep table text readable inside the accordion cell
      [...src.querySelectorAll('tr')].forEach((tr) => {
        const p = document.createElement('p');
        p.textContent = [...tr.children].map((c) => clean(c.textContent)).filter(Boolean).join(' | ');
        if (p.textContent) out.push(p);
      });
      return;
    }
    const node = document.createElement(tag);
    node.innerHTML = src.innerHTML;
    sanitize(node);
    // some descriptions hold only an escaped "&nbsp;" (literal text): skip those
    if (clean(node.textContent.replace(/&nbsp;/g, ' '))) out.push(node);
  });
  return out;
}

function textPara(document, text) {
  const p = document.createElement('p');
  p.textContent = clean(text);
  return p;
}

function accordionRows(document, root, cfg) {
  const items = Array.isArray(cfg.accordionItems) ? cfg.accordionItems : [];
  if (items.length) {
    return items.map((item) => {
      const title = clean(decodeHtml(document, item.title).textContent);
      const content = richContent(document, decodeHtml(document, item.content));
      return title ? [[textPara(document, title)], content] : null;
    }).filter(Boolean);
  }
  return [...root.querySelectorAll('[data-testid="accordion-item"]')].map((item) => {
    const trigger = item.querySelector('h3, button');
    const region = item.querySelector('[role="region"]');
    const title = clean(trigger && trigger.textContent);
    return title ? [[textPara(document, title)], region ? richContent(document, region) : []] : null;
  }).filter(Boolean);
}

function rotatingTileRows(document, cfg) {
  return (cfg.tiles || []).map((tile) => {
    const title = clean(decodeHtml(document, tile.title).textContent);
    if (!title) return null;
    const content = [];
    if (tile.imagePath) {
      const img = document.createElement('img');
      img.src = absUrl(tile.imagePath);
      img.alt = tile.imageDecorative ? '' : clean(tile.imageAltText);
      content.push(img);
    }
    content.push(...richContent(document, decodeHtml(document, tile.description)));
    const bullets = (tile.bulletpoints || []).map((b) => clean(decodeHtml(document, b.bulletpoint).textContent)).filter(Boolean);
    if (bullets.length) {
      const ul = document.createElement('ul');
      bullets.forEach((b) => {
        const li = document.createElement('li');
        li.textContent = b;
        ul.append(li);
      });
      content.push(ul);
    }
    if (tile.ctalink) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = absUrl(tile.ctalink);
      a.textContent = clean(tile.ctatitle || tile.ctaTitle) || a.href;
      p.append(a);
      content.push(p);
    }
    return [[textPara(document, title)], content];
  }).filter(Boolean);
}

export default function parse(element, { document }) {
  const root = element.closest('div.accordion, div.rotatingtile') || element;
  if (!root.parentNode) return;

  const intro = [];
  let rows;
  const renderedTitle = root.querySelector('h2');
  const rotating = readConfig(root, 'rotatingtile');
  if (rotating || root.matches('div.rotatingtile')) {
    const cfg = rotating || {};
    const title = clean(decodeHtml(document, cfg.title).textContent) || clean(renderedTitle && renderedTitle.textContent);
    if (title) {
      const h2 = document.createElement('h2');
      h2.textContent = title;
      intro.push(h2);
    }
    intro.push(...richContent(document, decodeHtml(document, cfg.description)));
    rows = rotatingTileRows(document, cfg);
  } else {
    const cfg = readConfig(root, 'accordion') || {};
    const title = clean(decodeHtml(document, cfg.accordiontile).textContent) || clean(renderedTitle && renderedTitle.textContent);
    if (title) {
      const h2 = document.createElement('h2');
      h2.textContent = title;
      intro.push(h2);
    }
    rows = accordionRows(document, root, cfg);
  }

  if (!rows.length && !intro.length) return;
  const out = [...intro];
  if (rows.length) out.push(WebImporter.Blocks.createBlock(document, { name: 'accordion-divided', cells: rows }));
  root.replaceWith(...out);
}
