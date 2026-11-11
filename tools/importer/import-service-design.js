/* eslint-disable */
/* global WebImporter */

import heroSplitParser from './parsers/hero-split.js';
import cardsEyebrowParser from './parsers/cards-eyebrow.js';
import heroPhotoPanelParser from './parsers/hero-photo-panel.js';
import columnsAlternatingParser from './parsers/columns-alternating.js';
import carouselSplitParser from './parsers/carousel-split.js';
import formParser from './parsers/form.js';
import cleanupTransformer from './transformers/jll-cleanup.js';
import serviceOverviewCleanupTransformer from './transformers/service-overview-cleanup.js';
import serviceOverviewSectionsTransformer from './transformers/service-overview-sections.js';
// Service design pages reuse the service-overview transformers: both accept the
// "service-design" template name and run the service-landing steps for it (plus a design-only
// link mapping, see the cleanup transformer's header). The parsers add template-scoped
// handling for the designLanding hero, colorCards feature rows and the list CTA.
// jll-sections.js is the home template's section transformer (one break per first-match
// section selector). Service pages are a variable list of components, so
// service-overview-sections.js inserts the breaks instead; using both would double them.

const PAGE_TEMPLATE = {
  "name": "service-design",
  "urls": [
    "https://www.jll.com/en-us/services/design",
    "https://www.jll.com/en-us/services/project-management/design"
  ],
  "representativeUrl": "https://www.jll.com/en-us/services/design",
  "description": "JLL design service pages (/en-us/services/design; /project-management/design redirects to it): \"designLanding\" hero (autoplay video, CTA, H1), featured card lists (alternating feature rows and sector color cards), section headings, two-panel news carousel, side-content banner, shifting image links, query-driven design project cards and a contact section with form.",
  "blocks": [
    {
      "name": "hero-split",
      "instances": [
        "div.hero.aem-GridColumn"
      ]
    },
    {
      "name": "columns-alternating",
      "instances": [
        "div.featuredcardlist",
        "div.banner.aem-GridColumn:has(react-component[data-config*='\"bannerType\":\"sideContent\"'])",
        "div.banner.aem-GridColumn:has(.c-side-content)"
      ]
    },
    {
      "name": "carousel-split",
      "instances": [
        "div.carouselsingledouble"
      ]
    },
    {
      "name": "hero-photo-panel",
      "instances": [
        "div.banner.aem-GridColumn:has(react-component[data-config*='\"bannerType\":\"shiftingImageLinks\"'])"
      ]
    },
    {
      "name": "cards-eyebrow",
      "instances": [
        "div.dynamiclist"
      ]
    },
    {
      "name": "form",
      "instances": [
        "div.eloquaform"
      ]
    }
  ],
  "urlPattern": "/en-us/services/*",
  "sections": [
    {
      "id": "section-1-hero",
      "name": "Design landing hero (video poster, CTA, H1)",
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
      "id": "section-2-features",
      "name": "Featured cards (alternating feature rows)",
      "selector": [
        "div.featuredcardlist:not(:has(.featured-card-color-cards))"
      ],
      "style": null,
      "blocks": [
        "columns-alternating"
      ],
      "defaultContent": []
    },
    {
      "id": "section-3-news",
      "name": "News (section heading + two-panel carousel)",
      "selector": [
        "div.carouselsingledouble"
      ],
      "style": null,
      "blocks": [
        "carousel-split"
      ],
      "defaultContent": [
        "div.sectionheading h2"
      ]
    },
    {
      "id": "section-4-sectors",
      "name": "Sector color cards",
      "selector": [
        "div.featuredcardlist:has(.featured-card-color-cards)"
      ],
      "style": null,
      "blocks": [
        "columns-alternating"
      ],
      "defaultContent": []
    },
    {
      "id": "section-5-tetris",
      "name": "Delivered by Tetris (side content banner)",
      "selector": [
        "div.banner.aem-GridColumn:has(react-component[data-config*='\"bannerType\":\"sideContent\"'])"
      ],
      "style": null,
      "blocks": [
        "columns-alternating"
      ],
      "defaultContent": []
    },
    {
      "id": "section-6-transform",
      "name": "How we transform (section heading + shifting image links)",
      "selector": [
        "div.banner.aem-GridColumn:has(react-component[data-config*='\"bannerType\":\"shiftingImageLinks\"'])"
      ],
      "style": null,
      "blocks": [
        "hero-photo-panel"
      ],
      "defaultContent": [
        "div.sectionheading h2"
      ]
    },
    {
      "id": "section-7-projects",
      "name": "Design projects (client story cards, static snapshot + view-all link)",
      "selector": [
        "div.dynamiclist"
      ],
      "style": null,
      "blocks": [
        "cards-eyebrow"
      ],
      "defaultContent": [
        "div.sectionheading h2",
        "div.dynamiclist a[href*=\"client-stories\"]"
      ]
    },
    {
      "id": "section-8-contact",
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
  'cards-eyebrow': cardsEyebrowParser,
  'hero-photo-panel': heroPhotoPanelParser,
  'columns-alternating': columnsAlternatingParser,
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
