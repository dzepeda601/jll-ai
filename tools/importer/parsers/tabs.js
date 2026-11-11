/* eslint-disable */
/* global WebImporter */

/**
 * Parser: tabs (underline) — JLL "tabbedinformation" (service-detail pages).
 *
 * Source: div.tabbedinformation > react-component[data-component="tabbedinformation"].
 * data-config: { informationType: 'visual' | 'text', maintitle,
 *   visual: { tabs: [ { title, headline (HTML), points: [ { bulletpoint } ], ctas,
 *                       imageurl, imageaccessibilitylabel } ] },
 *   text:   { tabs: [ { title, headline (HTML), points, ctas: [ { ctatitle, ctaurl } ] } ] } }
 * The rendered tabs are cfg[informationType].tabs (the other list is stale authoring
 * data); the other list is only used when that one is empty.
 * Fallback: rendered tab labels and the (single) rendered panel.
 *
 * Output (blocks/tabs/README.md):
 *   <h2>maintitle</h2>                         section default content before the block
 *   tabs (underline): one row per tab: label | content (paragraphs, bullet list,
 *                     CTA links, optional image)
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
  return String(text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(document, str) {
  const div = document.createElement('div');
  if (!str) return div;
  div.innerHTML = String(str);
  if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
  div.querySelectorAll('script, style').forEach((n) => n.remove());
  return div;
}

function readConfig(root) {
  const rc = root.querySelector('react-component[data-component="tabbedinformation"][data-config]');
  if (!rc) return null;
  try {
    return JSON.parse(rc.getAttribute('data-config') || 'null');
  } catch (e) {
    return null;
  }
}

function isBlank(node) {
  return node.nodeName === 'BR' || (node.nodeType === 3 && !clean(node.textContent));
}

/** Paragraphs / lists / sub-headings (as h3) with inline formatting and links kept. */
function richNodes(document, container) {
  const out = [];
  const sel = 'p, ul, ol, h1, h2, h3, h4, h5, h6';
  const blocks = [...container.querySelectorAll(sel)].filter((n) => !n.parentElement.closest(sel));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  sources.forEach((src) => {
    let tag = 'p';
    if (/^(UL|OL)$/.test(src.tagName)) tag = src.tagName.toLowerCase();
    else if (/^H[1-6]$/.test(src.tagName)) tag = 'h3';
    const node = document.createElement(tag);
    node.innerHTML = src.innerHTML;
    node.querySelectorAll('img, picture, svg, button').forEach((n) => n.remove());
    node.querySelectorAll('span, font, div').forEach((n) => n.replaceWith(...n.childNodes));
    [['b', 'strong'], ['i', 'em']].forEach(([from, to]) => {
      node.querySelectorAll(from).forEach((n) => {
        const repl = document.createElement(to);
        repl.append(...n.childNodes);
        n.replaceWith(repl);
      });
    });
    node.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((attr) => {
        if (!(n.tagName === 'A' && attr.name === 'href')) n.removeAttribute(attr.name);
      });
      if (n.tagName === 'A') n.setAttribute('href', absUrl(n.getAttribute('href')));
    });
    // the source pads bold intro lines with <br><br>&nbsp;: drop edge breaks and blanks
    node.querySelectorAll('strong, em').forEach((n) => {
      while (n.lastChild && isBlank(n.lastChild)) n.lastChild.remove();
      while (n.firstChild && isBlank(n.firstChild)) n.firstChild.remove();
      if (!clean(n.textContent)) n.remove();
    });
    while (node.lastChild && isBlank(node.lastChild)) node.lastChild.remove();
    while (node.firstChild && isBlank(node.firstChild)) node.firstChild.remove();
    if (clean(node.textContent)) out.push(node);
  });
  return out;
}

function linkPara(document, label, href) {
  if (!clean(label) || !href) return null;
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = absUrl(href);
  a.textContent = clean(label);
  p.append(a);
  return p;
}

function imagePara(document, src, alt) {
  if (!src) return null;
  const p = document.createElement('p');
  const img = document.createElement('img');
  img.src = absUrl(src);
  img.alt = clean(alt);
  p.append(img);
  return p;
}

function panelFromConfig(document, tab) {
  const nodes = [...richNodes(document, decodeHtml(document, tab.headline))];
  const points = (tab.points || [])
    .map((p) => clean(decodeHtml(document, p.bulletpoint).textContent).replace(/^-\s*/, ''))
    .filter(Boolean);
  if (points.length) {
    const ul = document.createElement('ul');
    points.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      ul.append(li);
    });
    nodes.push(ul);
  }
  (tab.ctas || []).forEach((cta) => {
    const p = linkPara(document, cta.ctatitle || cta.accessibilitylabel, cta.ctaurl);
    if (p) nodes.push(p);
  });
  const image = imagePara(document, tab.imageurl, tab.imageaccessibilitylabel);
  if (image) nodes.push(image);
  return nodes;
}

function tabsFromConfig(document, cfg) {
  const valid = (list) => (Array.isArray(list) ? list : []).filter((t) => t && clean(t.title));
  const type = cfg.informationType === 'text' ? 'text' : 'visual';
  const other = type === 'text' ? 'visual' : 'text';
  let list = valid(cfg[type] && cfg[type].tabs);
  if (!list.length) list = valid(cfg[other] && cfg[other].tabs);
  return list.map((tab) => ({ title: clean(tab.title), nodes: panelFromConfig(document, tab) }));
}

function tabsFromDom(document, root) {
  const labels = [...root.querySelectorAll('[role="tab"]')].map((t) => clean(t.textContent)).filter(Boolean);
  const panel = root.querySelector('[role="tabpanel"]');
  return labels.map((title, i) => {
    const nodes = [];
    if (i === 0 && panel) {
      nodes.push(...richNodes(document, panel));
      const img = panel.querySelector('img');
      const image = img && imagePara(document, img.getAttribute('src'), img.getAttribute('alt'));
      if (image) nodes.push(image);
    }
    return { title, nodes };
  });
}

export default function parse(element, { document }) {
  const root = element.closest('div.tabbedinformation') || element;
  if (!root.parentNode) return;
  const cfg = readConfig(root);

  const tabs = (cfg ? tabsFromConfig(document, cfg) : tabsFromDom(document, root))
    .filter((tab) => tab.title);
  const renderedTitle = root.querySelector('h2');
  const title = clean(decodeHtml(document, cfg && cfg.maintitle).textContent)
    || clean(renderedTitle && renderedTitle.textContent);

  const out = [];
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    out.push(h2);
  }
  if (tabs.length) {
    const cells = tabs.map(({ title: label, nodes }) => [label, nodes.length ? nodes : '']);
    out.push(WebImporter.Blocks.createBlock(document, { name: 'tabs', variants: ['underline'], cells }));
  }
  if (!out.length) return;
  root.replaceWith(...out);
}
