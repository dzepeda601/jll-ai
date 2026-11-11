/* eslint-disable */
/* global WebImporter */

import heroSplitParser from './parsers/hero-split.js';
import cardsStatsParser from './parsers/cards-stats.js';
import cardsEyebrowParser from './parsers/cards-eyebrow.js';
import heroPhotoPanelParser from './parsers/hero-photo-panel.js';
import columnsAlternatingParser from './parsers/columns-alternating.js';
import accordionDividedParser from './parsers/accordion-divided.js';
import carouselSplitParser from './parsers/carousel-split.js';
import formParser from './parsers/form.js';
import cleanupTransformer from './transformers/jll-cleanup.js';
import serviceOverviewCleanupTransformer from './transformers/service-overview-cleanup.js';
import serviceOverviewSectionsTransformer from './transformers/service-overview-sections.js';
// jll-sections.js is the home template's section transformer (one break per first-match
// section selector). Service pages are a variable list of components, so
// service-overview-sections.js inserts the breaks instead; using both would double them.

const PAGE_TEMPLATE = {
  "name": "service-overview",
  "urls": [
    "https://www.jll.com/en-us/services/capital-markets",
    "https://www.jll.com/en-us/services/experience-services",
    "https://www.jll.com/en-us/services/facilities-management",
    "https://www.jll.com/en-us/services/financing",
    "https://www.jll.com/en-us/services/investing",
    "https://www.jll.com/en-us/services/leasing",
    "https://www.jll.com/en-us/services/occupancy-space-planning",
    "https://www.jll.com/en-us/services/operations-management",
    "https://www.jll.com/en-us/services/portfolio-management",
    "https://www.jll.com/en-us/services/strategy-design",
    "https://www.jll.com/en-us/services/technology",
    "https://www.jll.com/en-us/services/value-risk"
  ],
  "representativeUrl": "https://www.jll.com/en-us/services/capital-markets",
  "description": "JLL service overview pages (e.g. /en-us/services/capital-markets, /leasing, /investing): golden-ratio hero, stats row, service tile lists, side-content banners (image or Brightcove video), photo + link panel (jumppoint) or people banner, client-story carousel, article / listing card lists, FAQ or rotating-tile accordion and a contact section with form.",
  "urlPattern": "/en-us/services/*",
  "blocks": [
    {
      "name": "hero-split",
      "instances": [
        "div.hero.aem-GridColumn",
        "react-component[data-component=\"hero\"]"
      ]
    },
    {
      "name": "cards-stats",
      "instances": [
        "div.stats.aem-GridColumn",
        "react-component[data-component=\"stats\"]"
      ]
    },
    {
      "name": "cards-eyebrow",
      "instances": [
        "div.dynamiclist.aem-GridColumn",
        "div.dynamiclist"
      ]
    },
    {
      "name": "hero-photo-panel",
      "instances": [
        "div.jumppoint.aem-GridColumn",
        "div.banner.aem-GridColumn:has(.c-people)"
      ]
    },
    {
      "name": "columns-alternating",
      "instances": [
        "div.banner.aem-GridColumn:has(.c-side-content)"
      ]
    },
    {
      "name": "accordion-divided",
      "instances": [
        "div.accordion.aem-GridColumn",
        "div.rotatingtile.aem-GridColumn"
      ]
    },
    {
      "name": "carousel-split",
      "instances": [
        "div.carouselsingledouble"
      ]
    },
    {
      "name": "form",
      "instances": [
        "div.eloquaform"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1-hero",
      "name": "Service hero",
      "selector": [
        "div.hero.aem-GridColumn"
      ],
      "style": null,
      "blocks": [
        "hero-split"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2-stats",
      "name": "Stats (e.g. A capital markets leader)",
      "selector": [
        "div.stats.aem-GridColumn"
      ],
      "style": null,
      "blocks": [
        "cards-stats"
      ],
      "defaultContent": [
        "div.stats.aem-GridColumn h2",
        "div.stats.aem-GridColumn .rich-text p"
      ]
    },
    {
      "id": "section-3-investing",
      "name": "Service tiles (Investing / Explore our services)",
      "selector": [
        "div.cmp-container > div.aem-Grid > div.dynamiclist:nth-of-type(2)",
        "div.dynamiclist.hidetags"
      ],
      "style": null,
      "blocks": [
        "cards-eyebrow"
      ],
      "defaultContent": [
        "div.dynamiclist .c-list-with-request__title"
      ]
    },
    {
      "id": "section-4-financing",
      "name": "Service tiles (Financing)",
      "selector": [
        "div.cmp-container > div.aem-Grid > div.dynamiclist:nth-of-type(3)"
      ],
      "style": null,
      "blocks": [
        "cards-eyebrow"
      ],
      "defaultContent": [
        "div.dynamiclist .c-list-with-request__title"
      ]
    },
    {
      "id": "section-5-value-risk",
      "name": "Service tiles (Value and risk)",
      "selector": [
        "div.cmp-container > div.aem-Grid > div.dynamiclist:nth-of-type(4)"
      ],
      "style": null,
      "blocks": [
        "cards-eyebrow"
      ],
      "defaultContent": [
        "div.dynamiclist .c-list-with-request__title"
      ]
    },
    {
      "id": "section-6-technology",
      "name": "Side-content banner(s) (image or video)",
      "selector": [
        "div.banner.aem-GridColumn:has(.c-side-content)"
      ],
      "style": null,
      "blocks": [
        "columns-alternating"
      ],
      "defaultContent": []
    },
    {
      "id": "section-7-expertise",
      "name": "Our fields of expertise (photo + link panel)",
      "selector": [
        "div.jumppoint.aem-GridColumn"
      ],
      "style": null,
      "blocks": [
        "hero-photo-panel"
      ],
      "defaultContent": []
    },
    {
      "id": "section-8-clients",
      "name": "What our clients say (client story carousel)",
      "selector": [
        "div.carouselsingledouble"
      ],
      "style": null,
      "blocks": [
        "carousel-split"
      ],
      "defaultContent": [
        "div.carouselsingledouble h2"
      ]
    },
    {
      "id": "section-9-articles",
      "name": "Read our latest articles",
      "selector": [
        "div.cmp-container > div.aem-Grid > div.dynamiclist:nth-of-type(8)"
      ],
      "style": null,
      "blocks": [
        "cards-eyebrow"
      ],
      "defaultContent": [
        "div.dynamiclist .c-list-with-request__title"
      ]
    },
    {
      "id": "section-10-listings",
      "name": "View our featured listings",
      "selector": [
        "div.cmp-container > div.aem-Grid > div.dynamiclist:nth-of-type(9)"
      ],
      "style": null,
      "blocks": [
        "cards-eyebrow"
      ],
      "defaultContent": [
        "div.dynamiclist .c-list-with-request__title"
      ]
    },
    {
      "id": "section-11-contact",
      "name": "Contact us (editorial + form)",
      "selector": [
        "div.editorial.aem-GridColumn:has(+ div.eloquaform)",
        "div.eloquaform"
      ],
      "style": null,
      "blocks": [
        "form"
      ],
      "defaultContent": [
        "div.editorial .editorial__title h2",
        "div.editorial .editorial__body p"
      ]
    }
  ]
};

const parsers = {
  'hero-split': heroSplitParser,
  'cards-stats': cardsStatsParser,
  'cards-eyebrow': cardsEyebrowParser,
  'hero-photo-panel': heroPhotoPanelParser,
  'columns-alternating': columnsAlternatingParser,
  'accordion-divided': accordionDividedParser,
  'carousel-split': carouselSplitParser,
  form: formParser,
};
// Late transformers change the DOM (section <hr> markers, shared fragments), so their beforeTransform
// runs after block discovery.
const sectionTransformers = [serviceOverviewSectionsTransformer];
const fragmentTransformers = [];
const lateTransformers = [...sectionTransformers, ...fragmentTransformers];
const transformers = [cleanupTransformer, serviceOverviewCleanupTransformer, ...lateTransformers];
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

    // https://www.jll.com/en-us/services/capital-markets -> /en-us/services/capital-markets;
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
