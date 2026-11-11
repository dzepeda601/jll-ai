/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-stats (JLL stats row).
 *
 * Source: div.stats > react-component[data-component="stats"]. Preferred input is data-config:
 *   { title, stats: [ { heading, subheading } ], description (HTML or plain text) }
 * Fallback: rendered h2, stat columns (value div + label p) and the rich-text description.
 *
 * Output (blocks/cards-stats/README.md):
 *   <h2>title</h2>                    section default content before the block
 *   [cards-stats] one row per stat, one cell: <p><strong>value</strong></p><p>label</p>
 *   <p>description</p>                section default content after the block
 * Text tiles (service-detail template, every stat has headingSize "small"): cards-stats (small),
 * one cell: <h3>heading</h3> (if any) and <p>label</p>.
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

function richParagraphs(document, container) {
  const out = [];
  const blocks = [...container.querySelectorAll('p, ul, ol')].filter((n) => !n.parentElement.closest('p, ul, ol'));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  sources.forEach((src) => {
    const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : 'p';
    const node = document.createElement(tag);
    node.innerHTML = src.innerHTML;
    node.querySelectorAll('span, font, div').forEach((n) => n.replaceWith(...n.childNodes));
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

function statsFromDom(root) {
  const labels = [...root.querySelectorAll('p')].filter((p) => !p.closest('.rich-text'));
  return labels.map((p) => {
    const value = p.previousElementSibling;
    return { value: clean(value && value.textContent), label: clean(p.textContent) };
  }).filter((s) => s.value || s.label);
}

export default function parse(element, { document, params }) {
  const root = element.closest('div.stats') || element;
  if (!root.parentNode) return;
  const cfg = readConfig(root, 'stats') || {};

  const renderedH2 = root.querySelector('h2');
  const title = clean(decodeHtml(document, cfg.title).textContent) || clean(renderedH2 && renderedH2.textContent);

  // text tiles are a service-detail option (service-overview output stays as imported)
  const templateName = params && params.targets && params.targets.template && params.targets.template.name;
  const small = templateName === 'service-detail'
    && Array.isArray(cfg.stats) && cfg.stats.length > 0
    && cfg.stats.every((s) => s.headingSize === 'small');
  const stats = Array.isArray(cfg.stats) && cfg.stats.length
    ? cfg.stats.map((s) => ({
      value: clean(decodeHtml(document, s.heading).textContent),
      label: clean(decodeHtml(document, s.subheading).textContent),
    }))
    : statsFromDom(root);

  let description = richParagraphs(document, decodeHtml(document, cfg.description));
  if (!description.length && !cfg.description) {
    const rich = root.querySelector('.rich-text');
    if (rich) description = richParagraphs(document, rich);
  }

  const cells = stats.filter((s) => s.value || s.label).map((s) => {
    const content = [];
    if (s.value && small) {
      const h3 = document.createElement('h3');
      h3.textContent = s.value;
      content.push(h3);
    } else if (s.value) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = s.value;
      p.append(strong);
      content.push(p);
    }
    if (s.label) {
      const p = document.createElement('p');
      p.textContent = s.label;
      content.push(p);
    }
    return [content];
  });

  const out = [];
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    out.push(h2);
  }
  if (cells.length) {
    out.push(WebImporter.Blocks.createBlock(document, small
      ? { name: 'cards-stats', variants: ['small'], cells }
      : { name: 'cards-stats', cells }));
  }
  out.push(...description);
  if (!out.length) return;
  root.replaceWith(...out);
}
