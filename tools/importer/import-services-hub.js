/* eslint-disable */
/* global WebImporter */

import cardsEyebrowParser from './parsers/cards-eyebrow.js';
import cleanupTransformer from './transformers/jll-cleanup.js';
import serviceOverviewCleanupTransformer from './transformers/service-overview-cleanup.js';
import serviceOverviewSectionsTransformer from './transformers/service-overview-sections.js';
import servicesHubTransformer from './transformers/services-hub.js';
// The services hub reuses the service-overview transformers (both accept the "services-hub"
// template name and apply the service-overview rules) plus its own services-hub.js: it reads
// every page of the paginated search results in preprocess and turns the media-less hero into
// default content (see its header).
// jll-sections.js is the home template's section transformer (one break per first-match
// section selector). Service pages are a variable list of components, so
// service-overview-sections.js inserts the breaks instead; using both would double them.

const PAGE_TEMPLATE = {
  "name": "services-hub",
  "urls": [
    "https://www.jll.com/en-us/services"
  ],
  "representativeUrl": "https://www.jll.com/en-us/services",
  "description": "JLL services hub (/en-us/services): \"single\" hero (H1 + intro on a light band, no media) and the search component listing every service / hub page (paginated image cards; static snapshot of all pages).",
  "blocks": [
    {
      "name": "cards-eyebrow",
      "instances": [
        "div.search.aem-GridColumn"
      ]
    }
  ],
  "urlPattern": "/en-us/services/*",
  "sections": [
    {
      "id": "section-1-intro",
      "name": "Hub intro (H1 + intro, light band)",
      "selector": [
        "div.hero.aem-GridColumn"
      ],
      "style": "light",
      "blocks": [],
      "defaultContent": [
        "div.hero h1",
        "div.hero p"
      ]
    },
    {
      "id": "section-2-results",
      "name": "Services list (all search result pages as image cards)",
      "selector": [
        "div.search.aem-GridColumn"
      ],
      "style": null,
      "blocks": [
        "cards-eyebrow"
      ],
      "defaultContent": []
    }
  ]
};

const parsers = {
  'cards-eyebrow': cardsEyebrowParser,
};
// Late transformers change the DOM (section <hr> markers, shared fragments), so their beforeTransform
// runs after block discovery.
const sectionTransformers = [serviceOverviewSectionsTransformer];
const fragmentTransformers = [];
const lateTransformers = [...sectionTransformers, ...fragmentTransformers];
const transformers = [cleanupTransformer, serviceOverviewCleanupTransformer, servicesHubTransformer, ...lateTransformers];
const earlyTransformers = transformers.filter((fn) => !lateTransformers.includes(fn));
// Catalog selectors (pageInstances, pageCleanup) count the <script> and <hr> elements the importer
// removes before transform, so a catalog template finds its targets in preprocess.
const CATALOG = Boolean(PAGE_TEMPLATE.pageCleanup || PAGE_TEMPLATE.blocks.some((b) => b.pageInstances));

function executeTransformers(hookName, element, payload, list = transformers) {
  const enhancedPayload = { ...payload, template: payload.params?.targets?.template || PAGE_TEMPLATE };
  list.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template, url) {
  const pageBlocks = [];
  const pageKey = (u) => {
    try { const { origin, pathname } = new URL(u); return `${origin}${pathname.replace(/\/$/, '')}`; }
    catch { return u; }
  };
  const key = pageKey(url);
  const claim = (blockDef, selector) => {
    let matches = [];
    try { matches = document.querySelectorAll(selector); } catch { return; }
    matches.forEach((element) => {
      if (pageBlocks.some((b) => b.element === element || b.element.contains(element) || element.contains(b.element))) return;
      pageBlocks.push({ name: blockDef.name, selector, element });
    });
  };
  template.blocks.forEach((blockDef) => {
    const entry = Object.entries(blockDef.pageInstances || {}).find(([u]) => pageKey(u) === key);
    (entry ? entry[1] : []).forEach((selector) => claim(blockDef, selector));
  });
  template.blocks.forEach((blockDef) => (blockDef.instances || []).forEach((selector) => claim(blockDef, selector)));
  return pageBlocks;
}

// Runs the early transformers, then marks each block and section target with an attribute: the
// importer re-creates the body before transform, so only attributes survive, not element references.
function markPageTargets(payload) {
  const { document, params } = payload;
  executeTransformers('beforeTransform', document.body, payload, earlyTransformers);
  const blocks = findBlocksOnPage(document, PAGE_TEMPLATE, params.originalURL).map(({ name, selector, element }, i) => {
    element.setAttribute('data-excat-block', String(i));
    return { name, selector };
  });
  const sections = (PAGE_TEMPLATE.sections || []).map((section, i) => {
    const target = (section.selector || []).map((s) => { try { return document.querySelector(s); } catch { return null; } }).find(Boolean);
    if (!target) return section;
    target.setAttribute('data-excat-section', String(i));
    return { ...section, selector: [`[data-excat-section="${i}"]`] };
  });
  params.targets = { blocks, template: { ...PAGE_TEMPLATE, sections } };
}

export default {
  preprocess: async (payload) => {
    // The importer strips empty inline elements (e.g. icon-only card overlay links) between
    // preprocess and transform, and lazy players only render once scrolled into view: the
    // transformers' preprocess hook (which may return a promise) prepares the page first.
    const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
    await Promise.all(earlyTransformers.map(async (fn) => {
      try { await fn('preprocess', payload.document.body, enhancedPayload); }
      catch (e) { console.error('Transformer failed at preprocess:', e); }
    }));
    if (CATALOG) markPageTargets(payload);
  },
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;
    params.fragments = [];

    if (!params.targets) markPageTargets(payload);
    const pageBlocks = params.targets.blocks
      .map((block, i) => ({ ...block, element: document.querySelector(`[data-excat-block="${i}"]`) }))
      .filter((block) => block.element);
    executeTransformers('beforeTransform', main, { ...payload, pageBlocks }, lateTransformers);

    pageBlocks.forEach((block) => {
      if (!main.contains(block.element)) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // A fragment's nodes left `main` before afterTransform: finalize it the same way, without the
    // page-only section breaks and metadata.
    params.fragments.forEach(({ element }) => {
      executeTransformers('afterTransform', element, payload, earlyTransformers);
      WebImporter.rules.transformBackgroundImages(element, document);
      WebImporter.rules.adjustImageUrls(element, url, params.originalURL);
    });

    // https://www.jll.com/en-us/services/leasing/green -> /en-us/services/leasing/green;
    // a folder URL (trailing slash) maps to that folder's index document.
    const { pathname } = new URL(params.originalURL);
    const rawPath = (pathname.endsWith('/') ? `${pathname}index` : pathname).replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }, ...params.fragments];
  },
};
