/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // tools/importer/import-service-overview.js
  var import_service_overview_exports = {};
  __export(import_service_overview_exports, {
    default: () => import_service_overview_default
  });

  // tools/importer/parsers/hero-split.js
  var HEADLINE_STYLES = {
    creative2: ["side-image", "bleed"],
    designServices: ["stacked"]
  };
  var TITLE_STYLES = {
    "service-design": { designLanding: ["stacked"] }
  };
  var ORIGIN = "https://www.jll.com";
  function absUrl(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN).href;
    } catch (e) {
      return value;
    }
  }
  function clean(text) {
    return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
  function decodeHtml(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function readConfig(root, component) {
    const sel = `react-component[data-component="${component}"]`;
    const rc = root.matches(sel) ? root : root.querySelector(`${sel}[data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config") || "null");
    } catch (e) {
      return null;
    }
  }
  function introParagraphs(document, container) {
    const blocks = [...container.querySelectorAll("p, h1, h2, h3, h4, h5, h6")].filter((n) => !n.parentElement.closest("p, h1, h2, h3, h4, h5, h6"));
    const sources = blocks.length ? blocks : clean(container.textContent) ? [container] : [];
    return sources.map((src) => {
      const p = document.createElement("p");
      p.innerHTML = src.innerHTML;
      p.querySelectorAll("span, font").forEach((n) => n.replaceWith(...n.childNodes));
      p.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl(n.getAttribute("href")));
      });
      return p;
    }).filter((p) => clean(p.textContent));
  }
  function ctaPara(document, label, href, wrapTag) {
    if (!clean(label) || !href) return null;
    const p = document.createElement("p");
    const wrap = document.createElement(wrapTag);
    const a = document.createElement("a");
    a.href = absUrl(href);
    a.textContent = clean(label);
    wrap.append(a);
    p.append(wrap);
    return p;
  }
  function visibleText(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll("span").forEach((span) => {
      if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean(span.textContent))) span.remove();
    });
    return clean(copy.textContent);
  }
  function parse(element, { document, params }) {
    const root = element.closest("div.hero") || element;
    if (!root.parentNode) return;
    const cfg = readConfig(root, "hero") || {};
    const templateName = params && params.targets && params.targets.template && params.targets.template.name;
    const titleStyle = (TITLE_STYLES[templateName] || {})[cfg.heroStyle];
    let src = cfg.imagePath || "";
    let alt = clean(cfg.imageAltText);
    if (!src) {
      const img = root.querySelector("img:not(video-js img)");
      const video = root.querySelector("video[poster]");
      if (img && img.getAttribute("src")) {
        src = img.getAttribute("src");
        alt = clean(img.getAttribute("alt"));
      } else if (video) {
        src = video.getAttribute("poster");
        alt = "";
      }
    }
    const renderedH1 = root.querySelector("h1");
    const headlineStyle = HEADLINE_STYLES[cfg.heroStyle] && clean(decodeHtml(document, cfg.headline).textContent);
    const eyebrow = headlineStyle ? clean(decodeHtml(document, cfg.title).textContent) : "";
    const title = headlineStyle || clean(decodeHtml(document, cfg.title).textContent) || clean(renderedH1 && renderedH1.textContent);
    let intro = introParagraphs(document, decodeHtml(document, cfg.description));
    if (headlineStyle) intro.push(...introParagraphs(document, decodeHtml(document, cfg.subDescription)));
    if (!intro.length && renderedH1) {
      const block2 = renderedH1.closest("div.flex-col") || renderedH1.parentElement;
      intro = [...block2.querySelectorAll("p")].map((p) => {
        const copy = document.createElement("p");
        copy.textContent = clean(p.textContent);
        return copy;
      }).filter((p) => p.textContent);
    }
    const ctas = [];
    const primary = ctaPara(document, cfg.primaryCTATitle, cfg.primaryCTAUrl, "strong");
    const secondary = ctaPara(document, cfg.secondaryCTATitle, cfg.secondaryCTAUrl, "em");
    if (primary || secondary) {
      if (primary) ctas.push(primary);
      if (secondary) ctas.push(secondary);
    } else {
      [...root.querySelectorAll("a[href]")].forEach((a) => {
        const testId = a.getAttribute("data-testid") || "";
        const wrap = /secondary/.test(testId) ? "em" : "strong";
        const p = ctaPara(document, visibleText(a), a.getAttribute("href"), wrap);
        if (p) ctas.push(p);
      });
    }
    const text = [];
    if (eyebrow) {
      const p = document.createElement("p");
      p.textContent = eyebrow;
      text.push(p);
    }
    if (title) {
      const h1 = document.createElement("h1");
      h1.textContent = title;
      text.push(h1);
    }
    text.push(...intro, ...ctas);
    if (!text.length) return;
    const cells = [];
    if (src) {
      const img = document.createElement("img");
      img.src = absUrl(src);
      img.alt = alt;
      cells.push([img]);
    }
    cells.push([text]);
    let variants = cfg.heroStyle === "sideImage" ? ["side-image"] : [];
    if (headlineStyle) variants = HEADLINE_STYLES[cfg.heroStyle];
    else if (titleStyle) variants = titleStyle;
    const block = WebImporter.Blocks.createBlock(document, variants.length ? { name: "hero-split", variants, cells } : { name: "hero-split", cells });
    root.replaceWith(block);
  }

  // tools/importer/parsers/cards-stats.js
  var ORIGIN2 = "https://www.jll.com";
  function absUrl2(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN2).href;
    } catch (e) {
      return value;
    }
  }
  function clean2(text) {
    return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
  function decodeHtml2(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function readConfig2(root, component) {
    const sel = `react-component[data-component="${component}"]`;
    const rc = root.matches(sel) ? root : root.querySelector(`${sel}[data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config") || "null");
    } catch (e) {
      return null;
    }
  }
  function richParagraphs(document, container) {
    const out = [];
    const blocks = [...container.querySelectorAll("p, ul, ol")].filter((n) => !n.parentElement.closest("p, ul, ol"));
    const sources = blocks.length ? blocks : clean2(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : "p";
      const node = document.createElement(tag);
      node.innerHTML = src.innerHTML;
      node.querySelectorAll("span, font, div").forEach((n) => n.replaceWith(...n.childNodes));
      node.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl2(n.getAttribute("href")));
      });
      if (clean2(node.textContent)) out.push(node);
    });
    return out;
  }
  function statsFromDom(root) {
    const labels = [...root.querySelectorAll("p")].filter((p) => !p.closest(".rich-text"));
    return labels.map((p) => {
      const value = p.previousElementSibling;
      return { value: clean2(value && value.textContent), label: clean2(p.textContent) };
    }).filter((s) => s.value || s.label);
  }
  function parse2(element, { document, params }) {
    const root = element.closest("div.stats") || element;
    if (!root.parentNode) return;
    const cfg = readConfig2(root, "stats") || {};
    const renderedH2 = root.querySelector("h2");
    const title = clean2(decodeHtml2(document, cfg.title).textContent) || clean2(renderedH2 && renderedH2.textContent);
    const templateName = params && params.targets && params.targets.template && params.targets.template.name;
    const small = templateName === "service-detail" && Array.isArray(cfg.stats) && cfg.stats.length > 0 && cfg.stats.every((s) => s.headingSize === "small");
    const stats = Array.isArray(cfg.stats) && cfg.stats.length ? cfg.stats.map((s) => ({
      value: clean2(decodeHtml2(document, s.heading).textContent),
      label: clean2(decodeHtml2(document, s.subheading).textContent)
    })) : statsFromDom(root);
    let description = richParagraphs(document, decodeHtml2(document, cfg.description));
    if (!description.length && !cfg.description) {
      const rich = root.querySelector(".rich-text");
      if (rich) description = richParagraphs(document, rich);
    }
    const cells = stats.filter((s) => s.value || s.label).map((s) => {
      const content = [];
      if (s.value && small) {
        const h3 = document.createElement("h3");
        h3.textContent = s.value;
        content.push(h3);
      } else if (s.value) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = s.value;
        p.append(strong);
        content.push(p);
      }
      if (s.label) {
        const p = document.createElement("p");
        p.textContent = s.label;
        content.push(p);
      }
      return [content];
    });
    const out = [];
    if (title) {
      const h2 = document.createElement("h2");
      h2.textContent = title;
      out.push(h2);
    }
    if (cells.length) {
      out.push(WebImporter.Blocks.createBlock(document, small ? { name: "cards-stats", variants: ["small"], cells } : { name: "cards-stats", cells }));
    }
    out.push(...description);
    if (!out.length) return;
    root.replaceWith(...out);
  }

  // tools/importer/parsers/cards-eyebrow.js
  var ORIGIN3 = "https://www.jll.com";
  function absUrl3(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN3).href;
    } catch (e) {
      return value;
    }
  }
  function clean3(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function el(document, tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }
  function cardRow(document, col) {
    const card = col.querySelector(".carousel-accordion-card") || col;
    const img = col.querySelector("img");
    const heading = card.querySelector("h1, h2, h3, h4, h5, h6");
    const paras = [...card.querySelectorAll("p")];
    const eyebrow = heading ? paras.find((p) => p.compareDocumentPosition(heading) & 4) : null;
    const desc = heading ? paras.find((p) => heading.compareDocumentPosition(p) & 4) : paras[0];
    const link = card.querySelector("a[href]");
    let imageCell = "";
    if (img && img.getAttribute("src")) {
      const image = document.createElement("img");
      image.src = absUrl3(img.getAttribute("src"));
      image.alt = img.getAttribute("alt") || "";
      imageCell = image;
    }
    const content = [];
    if (eyebrow && clean3(eyebrow.textContent)) content.push(el(document, "p", clean3(eyebrow.textContent)));
    if (heading) content.push(el(document, "h3", clean3(heading.textContent)));
    if (desc && clean3(desc.textContent)) content.push(el(document, "p", clean3(desc.textContent)));
    if (link) {
      const p = document.createElement("p");
      const a = el(document, "a", clean3(link.getAttribute("aria-label")) || "Read more");
      a.href = absUrl3(link.getAttribute("href"));
      p.append(a);
      content.push(p);
    }
    return content.length ? [imageCell, content] : null;
  }
  var PIN_HREF = "data-excat-href";
  var PIN_LABEL = "data-excat-label";
  function decodeHtml3(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function readDynamicListConfig(root) {
    const rc = root.matches('react-component[data-component="dynamiclist"]') ? root : root.querySelector('react-component[data-component="dynamiclist"][data-config]');
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config") || "null");
    } catch (e) {
      return null;
    }
  }
  function descParagraphs(document, container) {
    const blocks = [...container.querySelectorAll("p")].filter((n) => !n.parentElement.closest("p"));
    const sources = blocks.length ? blocks : clean3(container.textContent) ? [container] : [];
    return sources.map((src) => {
      const p = document.createElement("p");
      p.innerHTML = src.innerHTML;
      p.querySelectorAll("span, font, div").forEach((n) => n.replaceWith(...n.childNodes));
      p.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl3(n.getAttribute("href")));
      });
      return p;
    }).filter((p) => clean3(p.textContent));
  }
  function linkPara(document, href, label) {
    const p = document.createElement("p");
    const a = el(document, "a", clean3(label) || absUrl3(href));
    a.href = absUrl3(href);
    p.append(a);
    return p;
  }
  function cardLink(card) {
    const pinned = card.matches(`[${PIN_HREF}]`) ? card : card.querySelector(`[${PIN_HREF}]`);
    if (pinned) return { href: pinned.getAttribute(PIN_HREF), label: pinned.getAttribute(PIN_LABEL) || "" };
    const a = [...card.querySelectorAll("a[href]")].find((x) => !x.closest('ul, [data-testid$="__tags"]'));
    return a ? { href: a.getAttribute("href"), label: a.getAttribute("aria-label") || clean3(a.textContent) } : null;
  }
  function renderedItems(root) {
    const container = root.querySelector(".c-list-container") || root;
    const titled = [...container.querySelectorAll("h3")];
    const items = [];
    titled.forEach((h3) => {
      let item = h3;
      while (item.parentElement && item.parentElement !== container && item.parentElement.querySelectorAll("h3").length === 1) item = item.parentElement;
      if (!items.includes(item)) items.push(item);
    });
    return items;
  }
  function tileRowsFromConfig(document, pageList) {
    return pageList.map((item) => {
      const title = clean3(decodeHtml3(document, item.title).textContent);
      const content = [];
      if (title) content.push(el(document, "h3", title));
      content.push(...descParagraphs(document, decodeHtml3(document, item.description)));
      if (item.ctaLink) content.push(linkPara(document, item.ctaLink, title));
      return content.length ? [content] : null;
    }).filter(Boolean);
  }
  function tileRowsFromDom(document, root) {
    return renderedItems(root).map((item) => {
      const h3 = item.querySelector("h3");
      const title = clean3(h3 && h3.textContent);
      const content = [];
      if (title) content.push(el(document, "h3", title));
      const desc = item.querySelector('.description, [data-testid$="__description"]');
      if (desc && clean3(desc.textContent)) content.push(el(document, "p", clean3(desc.textContent)));
      const tags = [...item.querySelectorAll("ul a[href]")];
      if (tags.length) {
        const ul = document.createElement("ul");
        tags.forEach((tag) => {
          const li = document.createElement("li");
          const a = el(document, "a", clean3(tag.textContent));
          a.href = absUrl3(tag.getAttribute("href"));
          li.append(a);
          ul.append(li);
        });
        content.push(ul);
      }
      const target = cardLink(item);
      if (target && target.href) content.push(linkPara(document, target.href, target.label || title));
      return content.length ? [content] : null;
    }).filter(Boolean);
  }
  function cardRowsFromDom(document, root) {
    return renderedItems(root).map((item) => {
      const h3 = item.querySelector("h3");
      const title = clean3(h3 && h3.textContent);
      const img = item.querySelector("img");
      let imageCell = "";
      if (img && img.getAttribute("src") && !/^data:/.test(img.getAttribute("src"))) {
        const image = document.createElement("img");
        image.src = absUrl3(img.getAttribute("src")).replace(/^http:\/\//i, "https://");
        image.alt = img.getAttribute("alt") || "";
        imageCell = image;
      }
      const content = [];
      const eyebrow = item.querySelector('[data-testid$="__content-preheader"]') || [...item.querySelectorAll("p")].find((p) => h3 && p.compareDocumentPosition(h3) & 4);
      if (eyebrow && clean3(eyebrow.textContent)) content.push(el(document, "p", clean3(eyebrow.textContent)));
      if (title) content.push(el(document, "h3", title));
      let details = [...item.querySelectorAll('[data-testid$="__content-body"], [data-testid$="__footer-text"]')];
      if (!details.length && h3) {
        details = [...item.querySelectorAll("div.wrap-anywhere, div.text-sm")].filter((d) => h3.compareDocumentPosition(d) & 4 && !d.querySelector("div.wrap-anywhere, div.text-sm"));
      }
      details.forEach((d) => {
        if (clean3(d.textContent)) content.push(el(document, "p", clean3(d.textContent)));
      });
      const target = cardLink(item);
      if (target && target.href) content.push(linkPara(document, target.href, target.label || title));
      return content.length ? [imageCell, content] : null;
    }).filter(Boolean);
  }
  function parseDynamicList(element, document) {
    const root = element.closest("div.dynamiclist") || element;
    if (!root.parentNode) return;
    const cfg = readDynamicListConfig(root) || {};
    const isTiles = cfg.listType ? cfg.listType === "tile" : !!root.querySelector(".search-tile-card");
    let cells;
    if (isTiles) {
      cells = Array.isArray(cfg.pageList) && cfg.pageList.length ? tileRowsFromConfig(document, cfg.pageList) : tileRowsFromDom(document, root);
    } else {
      cells = cardRowsFromDom(document, root);
    }
    const out = [];
    const renderedTitle = root.querySelector("h2");
    const title = clean3(decodeHtml3(document, cfg.title).textContent) || clean3(renderedTitle && renderedTitle.textContent);
    if (title && cfg.hideTitle !== true) {
      const h2 = document.createElement("h2");
      if (cfg.titleCtaPath) {
        const a = el(document, "a", title);
        a.href = absUrl3(cfg.titleCtaPath);
        h2.append(a);
      } else {
        h2.textContent = title;
      }
      out.push(h2);
    }
    if (cells.length) {
      out.push(WebImporter.Blocks.createBlock(document, {
        name: "cards-eyebrow",
        variants: isTiles ? ["tiles"] : [],
        cells
      }));
    }
    if (!out.length) return;
    root.replaceWith(...out);
  }
  function readJumppointConfig(root) {
    const rc = root.querySelector('react-component[data-component="jumppoint"][data-config]');
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config") || "null");
    } catch (e) {
      return null;
    }
  }
  function parseJumppoint(element, document) {
    const root = element.closest("div.jumppoint") || element;
    if (!root.parentNode) return;
    const cfg = readJumppointConfig(root) || {};
    const out = [];
    const renderedTitle = root.querySelector("h2");
    const title = clean3(decodeHtml3(document, cfg.title).textContent) || clean3(renderedTitle && renderedTitle.textContent);
    if (title) out.push(el(document, "h2", title));
    out.push(...descParagraphs(document, decodeHtml3(document, cfg.description)));
    const primary = cfg.ctaUrl ? [cfg.ctaTitle, cfg.ctaUrl] : [cfg.primaryCtaLabel, cfg.primaryCtaUrl];
    [primary, [cfg.secondaryCtaLabel, cfg.secondaryCtaUrl]].forEach(([label, href]) => {
      if (clean3(label) && href) out.push(linkPara(document, href, label));
    });
    let cells = [];
    if (Array.isArray(cfg.destinations) && cfg.destinations.length) {
      cells = cfg.destinations.map((d) => {
        const name = clean3(decodeHtml3(document, d.title).textContent);
        const content = [];
        if (name) content.push(el(document, "h3", name));
        content.push(...descParagraphs(document, decodeHtml3(document, d.description)));
        if (d.url) content.push(linkPara(document, d.url, name || d.accessibilityLabel));
        return content.length ? [content] : null;
      }).filter(Boolean);
    } else {
      cells = [...root.querySelectorAll("a[href]")].filter((a) => a.querySelector("p") && a.nextElementSibling).map((a) => {
        const name = clean3(a.textContent).replace(/chevron_right$/, "").trim();
        const content = [el(document, "h3", name)];
        const desc = clean3(a.nextElementSibling.textContent);
        if (desc) content.push(el(document, "p", desc));
        content.push(linkPara(document, a.getAttribute("href"), name));
        return [content];
      });
    }
    if (cells.length) {
      out.push(WebImporter.Blocks.createBlock(document, { name: "cards-eyebrow", variants: ["links"], cells }));
    }
    if (!out.length) return;
    root.replaceWith(...out);
  }
  function listCta(document, element) {
    const root = element.closest("div.dynamiclist") || element;
    const cfg = readDynamicListConfig(root) || {};
    if (!clean3(cfg.ctaTitle) || !cfg.ctaUrl) return null;
    return linkPara(document, cfg.ctaUrl, cfg.ctaTitle);
  }
  function searchResultItems(root) {
    try {
      const items = JSON.parse(root.getAttribute("data-excat-search-results") || "null");
      if (Array.isArray(items) && items.length) return items;
    } catch (e) {
    }
    return [...root.querySelectorAll(".c-default-card")].map((card) => {
      const pinned = card.matches(`[${PIN_HREF}]`) ? card : card.querySelector(`[${PIN_HREF}]`);
      const link = card.querySelector("a[href]");
      const header = card.querySelector(".c-default-card__content-header");
      const body = card.querySelector(".c-default-card__content-body");
      const img = card.querySelector(".c-default-card__image img");
      return {
        href: pinned && pinned.getAttribute(PIN_HREF) || link && link.getAttribute("href") || "",
        title: clean3(header && header.textContent) || clean3(pinned && pinned.getAttribute(PIN_LABEL)),
        description: clean3(body && body.textContent),
        image: img ? img.getAttribute("src") || "" : "",
        alt: img ? img.getAttribute("alt") || "" : ""
      };
    });
  }
  function parseSearchResults(element, document) {
    const root = element.closest("div.search") || element;
    if (!root.parentNode) return;
    const cells = searchResultItems(root).filter((item) => item.title && item.href).map((item) => {
      let imageCell = "";
      if (item.image) {
        const image = document.createElement("img");
        image.src = absUrl3(item.image);
        image.alt = item.alt || "";
        imageCell = image;
      }
      const content = [el(document, "h3", item.title)];
      if (item.description) content.push(el(document, "p", item.description));
      content.push(linkPara(document, item.href, item.title));
      return [imageCell, content];
    });
    if (!cells.length) return;
    root.replaceWith(WebImporter.Blocks.createBlock(document, { name: "cards-eyebrow", variants: ["grid"], cells }));
  }
  function parse3(element, { document, params }) {
    if (!element.parentNode) return;
    if (element.matches("div.search")) {
      parseSearchResults(element, document);
      return;
    }
    if (element.matches("div.jumppoint")) {
      parseJumppoint(element, document);
      return;
    }
    if (element.matches('div.dynamiclist, react-component[data-component="dynamiclist"]')) {
      const templateName = params && params.targets && params.targets.template && params.targets.template.name;
      const cta = templateName === "service-design" ? listCta(document, element) : null;
      const marker = cta && document.createComment("excat-list-cta");
      if (marker) (element.closest("div.dynamiclist") || element).after(marker);
      parseDynamicList(element, document);
      if (marker) marker.replaceWith(cta);
      return;
    }
    if (element.closest('div.accordion-carousel, react-component[data-component="accordion-carousel"]')) return;
    const slide = element.matches(".carousel-accordion-slide") ? element : element.querySelector(".carousel-accordion-slide") || element;
    const cols = [...slide.children].filter((c) => c.querySelector(".carousel-accordion-card, h1, h2, h3, h4, h5, h6"));
    const cells = cols.map((col) => cardRow(document, col)).filter(Boolean);
    if (!cells.length) return;
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-eyebrow", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/hero-photo-panel.js
  var ORIGIN4 = "https://www.jll.com";
  function absUrl4(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN4).href;
    } catch (e) {
      return value;
    }
  }
  function clean4(text) {
    return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
  function decodeHtml4(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function readConfig3(root, component) {
    const sel = `react-component[data-component="${component}"]`;
    const rc = root.matches(sel) ? root : root.querySelector(`${sel}[data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config") || "null");
    } catch (e) {
      return null;
    }
  }
  function richParagraphs2(document, container) {
    const out = [];
    const blocks = [...container.querySelectorAll("p, ul, ol")].filter((n) => !n.parentElement.closest("p, ul, ol"));
    const sources = blocks.length ? blocks : clean4(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : "p";
      const node = document.createElement(tag);
      node.innerHTML = src.innerHTML;
      node.querySelectorAll("span, font, div").forEach((n) => n.replaceWith(...n.childNodes));
      node.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl4(n.getAttribute("href")));
      });
      if (clean4(node.textContent)) out.push(node);
    });
    return out;
  }
  function makeImage(document, src, alt) {
    if (!src) return null;
    const img = document.createElement("img");
    img.src = absUrl4(src);
    img.alt = clean4(alt);
    return img;
  }
  function linkPara2(document, href, label) {
    const p = document.createElement("p");
    const a = document.createElement("a");
    a.href = absUrl4(href);
    a.textContent = clean4(label) || a.href;
    p.append(a);
    return p;
  }
  function photo(document, root, cfg) {
    if (cfg.imagePath) return makeImage(document, cfg.imagePath, cfg.imageAltText);
    if (cfg.bannerType === "people") return null;
    const img = root.querySelector("img");
    return img ? makeImage(document, img.getAttribute("src"), img.getAttribute("alt")) : null;
  }
  function jumppointRows(document, root, cfg) {
    const panel = [];
    const renderedTitle = root.querySelector("h2");
    const title = clean4(decodeHtml4(document, cfg.title).textContent) || clean4(renderedTitle && renderedTitle.textContent);
    if (title) {
      const h2 = document.createElement("h2");
      h2.textContent = title;
      panel.push(h2);
    }
    panel.push(...richParagraphs2(document, decodeHtml4(document, cfg.description)));
    let destinations = (cfg.destinations || []).map((d) => ({ label: clean4(d.title), url: d.url }));
    if (!destinations.length) {
      destinations = [...root.querySelectorAll("a[href]")].map((a) => ({
        label: clean4(a.textContent.replace(/chevron_right/g, "")),
        url: a.getAttribute("href")
      }));
    }
    const ul = document.createElement("ul");
    destinations.filter((d) => d.url && d.label).forEach((d) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = absUrl4(d.url);
      a.textContent = d.label;
      li.append(a);
      ul.append(li);
    });
    if (ul.children.length) panel.push(ul);
    return [panel];
  }
  function personCell(document, root, person, landing = false) {
    const name = clean4(`${person.firstName || ""} ${person.lastName || ""}`);
    const cell = [];
    const portrait = makeImage(document, person.photo, person.imageAlt || name);
    if (portrait) cell.push(portrait);
    if (name) {
      const h3 = document.createElement("h3");
      h3.textContent = name;
      cell.push(h3);
    }
    if (clean4(person.jobTitle)) {
      const p = document.createElement("p");
      p.textContent = clean4(person.jobTitle);
      cell.push(p);
    }
    if (person.linkedin) {
      const pinned = [...root.querySelectorAll("[data-excat-href]")].find((n) => n.getAttribute("data-excat-href") === person.linkedin);
      const aria = pinned ? pinned.getAttribute("data-excat-label") || "" : "";
      const label = aria.split(",").map(clean4).find((part) => /linkedin/i.test(part)) || "LinkedIn";
      cell.push(linkPara2(document, person.linkedin, label));
    }
    const profile = [...root.querySelectorAll("a[href]")].find((a) => {
      const aria = a.getAttribute("aria-label") || "";
      if (landing && /^(mailto|tel):/i.test(a.getAttribute("href") || "")) return false;
      return name && aria.includes(name) && !/linkedin/i.test(aria) && clean4(a.textContent);
    });
    if (profile) cell.push(linkPara2(document, profile.getAttribute("href"), profile.textContent));
    return cell;
  }
  function shiftingLinkRows(document, root, cfg) {
    let links = (cfg.links || []).map((l) => ({ label: clean4(l.button && l.button.label), url: l.button && l.button.url }));
    if (!links.length) {
      links = [...root.querySelectorAll("li a[href]")].map((a) => ({
        label: clean4(a.textContent.replace(/arrow_forward/g, "")),
        url: a.getAttribute("href")
      }));
    }
    const ul = document.createElement("ul");
    links.filter((l) => l.url && l.label).forEach((l) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = absUrl4(l.url);
      a.textContent = l.label;
      li.append(a);
      ul.append(li);
    });
    return ul.children.length ? [[ul]] : [[]];
  }
  function shiftingLinkImage(document, root, cfg) {
    const first = (cfg.links || []).find((l) => l.image && l.image.file);
    if (first) return makeImage(document, first.image.file, cfg.imageDecorative ? "" : first.image.imageAlt);
    const img = root.querySelector("img");
    return img ? makeImage(document, img.getAttribute("src"), img.getAttribute("alt")) : null;
  }
  function peopleRows(document, root, cfg, landing = false) {
    const panel = [];
    const title = clean4(decodeHtml4(document, cfg.peopleTitle).textContent);
    if (title) {
      const h2 = document.createElement("h2");
      h2.textContent = title;
      panel.push(h2);
    }
    panel.push(...richParagraphs2(document, decodeHtml4(document, cfg.peopleDescription)));
    if (cfg.peopleCTAUrl) panel.push(linkPara2(document, cfg.peopleCTAUrl, cfg.peopleCTATitle));
    if (cfg.seeMoreExpertsCTAUrl) panel.push(linkPara2(document, cfg.seeMoreExpertsCTAUrl, cfg.seeMoreExpertsCTATitle));
    const people = (cfg.peopleList || []).map((person) => personCell(document, root, person, landing)).filter((c) => c.length);
    return [panel, ...people];
  }
  function parse4(element, { document, params }) {
    const templateName = params && params.targets && params.targets.template && params.targets.template.name;
    const landing = templateName === "service-landing" || templateName === "service-detail";
    const root = element.closest("div.jumppoint, div.banner") || element;
    if (!root.parentNode) return;
    let cfg = readConfig3(root, "jumppoint");
    let row;
    if (cfg || root.matches("div.jumppoint")) {
      cfg = cfg || {};
      row = jumppointRows(document, root, cfg);
    } else {
      cfg = readConfig3(root, "banner") || {};
      if (cfg.bannerType === "shiftingImageLinks") {
        row = shiftingLinkRows(document, root, cfg);
      } else {
        if (cfg.bannerType && cfg.bannerType !== "people") return;
        row = peopleRows(document, root, cfg, landing);
      }
    }
    if (!row.some((cell) => cell.length)) return;
    const cells = [];
    const image = cfg.bannerType === "shiftingImageLinks" ? shiftingLinkImage(document, root, cfg) : photo(document, root, cfg);
    if (image) cells.push([image]);
    cells.push(row);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-photo-panel", cells });
    root.replaceWith(block);
  }

  // tools/importer/parsers/columns-alternating.js
  var ORIGIN5 = "https://www.jll.com";
  function absUrl5(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN5).href;
    } catch (e) {
      return value;
    }
  }
  function clean5(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function decodeHtml5(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function richParagraphs3(document, container) {
    const out = [];
    const blocks = [...container.querySelectorAll("p, ul, ol")].filter((n) => !n.parentElement.closest("p, ul, ol"));
    const sources = blocks.length ? blocks : clean5(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : "p";
      const node = document.createElement(tag);
      node.innerHTML = src.innerHTML;
      node.querySelectorAll("span").forEach((span) => span.replaceWith(...span.childNodes));
      node.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl5(n.getAttribute("href")));
      });
      if (clean5(node.textContent)) out.push(node);
    });
    return out;
  }
  function readConfig4(root, component) {
    const rc = root.matches && root.matches(`react-component[data-component="${component}"]`) ? root : root.querySelector(`react-component[data-component="${component}"][data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config"));
    } catch (e) {
      return null;
    }
  }
  function visibleText2(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll("span").forEach((span) => {
      if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean5(span.textContent))) span.remove();
    });
    return clean5(copy.textContent);
  }
  function cardsFromConfig(document, config) {
    if (!config || !Array.isArray(config.featuredCards) || !config.featuredCards.length) return null;
    const imageFirst = config.firstCardAssetAlignment !== "right";
    return config.featuredCards.map((card, idx) => ({
      image: card.image && card.image.imageUrl,
      alt: card.image && card.image.imageAlt || "",
      eyebrow: clean5(decodeHtml5(document, card.eyebrow).textContent),
      title: clean5(decodeHtml5(document, card.title).textContent),
      description: richParagraphs3(document, decodeHtml5(document, card.description)),
      links: (card.links || []).map((l) => ({ label: clean5(decodeHtml5(document, l.label).textContent), url: l.url })),
      imageFirst: idx % 2 === 0 ? imageFirst : !imageFirst
    }));
  }
  function cardsFromDom(document, root) {
    const articles = [...root.querySelectorAll("article.featured-card, .featured-card")].filter((a, i, arr) => !arr.some((o) => o !== a && o.contains(a)));
    if (!articles.length) return null;
    return articles.map((article) => {
      const img = article.querySelector(".featured-card__media-container img, img");
      const eyebrow = article.querySelector(".featured-card__eyebrow");
      const heading = article.querySelector(".featured-card__title, h1, h2, h3");
      const desc = article.querySelector(".featured-card__description");
      const row = article.querySelector(".featured-card__row");
      const flipped = row && (row.classList.contains("featured-card__flipped") || row.classList.contains("flex-row-reverse"));
      const links = [...article.querySelectorAll(".featured-card__link")].map((wrap) => {
        const a = wrap.querySelector("a[href]");
        return { label: visibleText2(a || wrap), url: a ? a.getAttribute("href") : "" };
      });
      return {
        image: img && img.getAttribute("src"),
        alt: img ? img.getAttribute("alt") || "" : "",
        eyebrow: eyebrow ? clean5(eyebrow.textContent) : "",
        title: heading ? clean5(heading.textContent) : "",
        description: desc ? richParagraphs3(document, desc) : [],
        links,
        imageFirst: !flipped
      };
    });
  }
  function buildRow(document, card) {
    let imageCell = "";
    if (card.image) {
      const img = document.createElement("img");
      img.src = absUrl5(card.image);
      img.alt = card.alt;
      imageCell = img;
    }
    const text = [];
    if (card.eyebrow) {
      const p = document.createElement("p");
      p.textContent = card.eyebrow;
      text.push(p);
    }
    if (card.title) {
      const h2 = document.createElement("h2");
      h2.textContent = card.title;
      text.push(h2);
    }
    text.push(...card.description);
    card.links.forEach((link) => {
      if (!link.label && !link.url) return;
      const p = document.createElement("p");
      if (link.url) {
        const a = document.createElement("a");
        a.href = absUrl5(link.url);
        a.textContent = link.label || absUrl5(link.url);
        p.append(a);
      } else {
        p.textContent = link.label;
      }
      text.push(p);
    });
    return card.imageFirst ? [imageCell, text] : [text, imageCell];
  }
  function bannerConfig(banner) {
    const cfg = readConfig4(banner, "banner");
    return cfg && cfg.bannerType === "sideContent" ? cfg : null;
  }
  function bannerDescription(document, container) {
    const out = [];
    const blocks = [...container.querySelectorAll("p, ul, ol, h1, h2, h3, h4, h5, h6")].filter((n) => !n.parentElement.closest("p, ul, ol, h1, h2, h3, h4, h5, h6"));
    const sources = blocks.length ? blocks : clean5(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      let tag = "p";
      if (/^(UL|OL)$/.test(src.tagName)) tag = src.tagName.toLowerCase();
      else if (/^H[1-6]$/.test(src.tagName)) tag = "h3";
      const node = document.createElement(tag);
      node.innerHTML = src.innerHTML;
      node.querySelectorAll("span, font").forEach((span) => span.replaceWith(...span.childNodes));
      node.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl5(n.getAttribute("href")));
      });
      while (node.firstChild && node.firstChild.nodeName === "BR") node.firstChild.remove();
      while (node.lastChild && node.lastChild.nodeName === "BR") node.lastChild.remove();
      if (clean5(node.textContent)) out.push(node);
    });
    return out;
  }
  function bannerMedia(document, banner, cfg) {
    const video = banner.querySelector("video-js[data-video-id], video[data-video-id]");
    const videoId = cfg.videoPlayer || video && video.getAttribute("data-video-id");
    if (cfg.mediaType === "video" && videoId && cfg.videoAccountId) {
      const media = [];
      const posterEl = banner.querySelector("video[poster]");
      if (posterEl && posterEl.getAttribute("poster")) {
        const poster = document.createElement("img");
        poster.src = absUrl5(posterEl.getAttribute("poster"));
        poster.alt = "";
        media.push(poster);
      }
      const url = `https://players.brightcove.net/${cfg.videoAccountId}/default_default/index.html?videoId=${videoId}`;
      const titleEl = banner.querySelector(".vjs-dock-title");
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = url;
      a.textContent = clean5(titleEl && titleEl.textContent) || url;
      p.append(a);
      media.push(p);
      return media;
    }
    let src = cfg.imagePath || "";
    let alt = clean5(cfg.imageAltText);
    if (!src) {
      const img2 = banner.querySelector("img");
      if (img2) {
        src = img2.getAttribute("src") || "";
        alt = clean5(img2.getAttribute("alt"));
      }
    }
    if (!src) return "";
    const img = document.createElement("img");
    img.src = absUrl5(src);
    img.alt = alt;
    return img;
  }
  function bannerRow(document, banner, cfg) {
    const text = [];
    const title = clean5(decodeHtml5(document, cfg.sideContentRightSideTitle).textContent);
    if (title) {
      const h2 = document.createElement("h2");
      h2.textContent = title;
      text.push(h2);
    }
    text.push(...bannerDescription(document, decodeHtml5(document, cfg.sideContentRightSideDescription)));
    (cfg.sideContentLinkList || []).forEach((item) => {
      const label = clean5(decodeHtml5(document, item.sideContentLinkTitle).textContent);
      if (!item.sideContentLinkUrl && !label) return;
      const p = document.createElement("p");
      if (item.sideContentLinkUrl) {
        const a = document.createElement("a");
        a.href = absUrl5(item.sideContentLinkUrl);
        a.textContent = label || absUrl5(item.sideContentLinkUrl);
        p.append(a);
      } else {
        p.textContent = label;
      }
      text.push(p);
    });
    const media = bannerMedia(document, banner, cfg);
    const flip = cfg.sideContentRightLeftSideFlipOn === true || cfg.sideContentRightLeftSideFlipOn === "true";
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
      while (next && next.tagName === "HR") next = null;
      current = next && next.matches("div.banner") ? next : null;
    }
    if (!rows.length) return;
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-alternating", cells: rows });
    consumed.forEach((n) => n.remove());
    banner.replaceWith(block);
  }
  function parseFeaturedTile(root, document) {
    const cfg = readConfig4(root, "featuredtile") || {};
    const text = [];
    const title = clean5(decodeHtml5(document, cfg.title).textContent);
    if (title) {
      const h2 = document.createElement("h2");
      h2.textContent = title;
      text.push(h2);
    }
    text.push(...bannerDescription(document, decodeHtml5(document, cfg.description)));
    if (cfg.ctaLink) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = absUrl5(cfg.ctaLink);
      a.textContent = clean5(cfg.ariaLabel) || title || absUrl5(cfg.ctaLink);
      p.append(a);
      text.push(p);
    }
    if (!text.length) return;
    const media = bannerMedia(document, root, {
      mediaType: cfg.videoPlayer ? "video" : "image",
      videoPlayer: cfg.videoPlayer,
      videoAccountId: cfg.account,
      imagePath: cfg.imagePath,
      imageAltText: cfg.imageAltText
    });
    const row = cfg.featuredTileFlipAsset === "right" ? [text, media] : [media, text];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-alternating", cells: [row] });
    root.replaceWith(block);
  }
  function parseContentBlock(root, document) {
    const cfg = readConfig4(root, "contentblock") || {};
    const renderedTitle = root.querySelector("h1, h2, h3");
    const img = root.querySelector("img");
    const link = cfg.primaryLink || {};
    const card = {
      image: cfg.image && cfg.image.imageUrl || img && img.getAttribute("src"),
      alt: cfg.image && cfg.image.imageAlt || img && img.getAttribute("alt") || "",
      eyebrow: "",
      title: clean5(decodeHtml5(document, cfg.title).textContent) || clean5(renderedTitle && renderedTitle.textContent),
      description: richParagraphs3(document, decodeHtml5(document, cfg.description)),
      links: link.url ? [{ label: clean5(link.label || link.ariaLabel), url: link.url }] : [],
      imageFirst: true
    };
    if (!card.title && !card.description.length) return;
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-alternating", cells: [buildRow(document, card)] });
    root.replaceWith(block);
  }
  function applyColorCards(document, config, cards) {
    const source = config && Array.isArray(config.featuredCards) ? config.featuredCards : [];
    if (source.length !== cards.length || !source.every((c) => c.featuredCardType === "colorCards")) return;
    cards.forEach((card, i) => {
      card.description.push(...richParagraphs3(document, decodeHtml5(document, source[i].subDescription)));
      card.imageFirst = false;
    });
  }
  function parse5(element, { document, params }) {
    const templateName = params && params.targets && params.targets.template && params.targets.template.name;
    const contentBlock = element.closest("div.contentblock");
    if (contentBlock) {
      if (contentBlock.parentNode) parseContentBlock(contentBlock, document);
      return;
    }
    const tile = element.closest("div.featuredtile");
    if (tile) {
      if (tile.parentNode) parseFeaturedTile(tile, document);
      return;
    }
    const banner = element.closest("div.banner");
    if (banner && bannerConfig(banner)) {
      if (banner.parentNode) parseSideContent(banner, document);
      return;
    }
    const root = element.closest("div.featuredcardlist") || element;
    if (!root.parentNode) return;
    const config = readConfig4(root, "featuredcardlist");
    const fromConfig = cardsFromConfig(document, config);
    const cards = fromConfig || cardsFromDom(document, root);
    if (!cards || !cards.length) return;
    if (fromConfig && templateName === "service-design") applyColorCards(document, config, cards);
    const cells = cards.map((card) => buildRow(document, card));
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-alternating", cells });
    root.replaceWith(block);
  }

  // tools/importer/parsers/accordion-divided.js
  var ORIGIN6 = "https://www.jll.com";
  function absUrl6(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN6).href;
    } catch (e) {
      return value;
    }
  }
  function clean6(text) {
    return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
  function decodeHtml6(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function readConfig5(root, component) {
    const sel = `react-component[data-component="${component}"]`;
    const rc = root.matches(sel) ? root : root.querySelector(`${sel}[data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config") || "null");
    } catch (e) {
      return null;
    }
  }
  function sanitize(node) {
    node.querySelectorAll("span, font, div").forEach((n) => n.replaceWith(...n.childNodes));
    node.querySelectorAll("*").forEach((n) => {
      [...n.attributes].forEach((attr) => {
        if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
      });
      if (n.tagName === "A") n.setAttribute("href", absUrl6(n.getAttribute("href")));
    });
    [...node.querySelectorAll("li")].reverse().forEach((li) => {
      if (!clean6(li.textContent)) li.remove();
    });
    [...node.querySelectorAll("ul, ol")].reverse().forEach((list) => {
      if (!list.children.length) list.remove();
    });
    while (node.firstChild && (node.firstChild.nodeName === "BR" || node.firstChild.nodeType === 3 && !clean6(node.firstChild.textContent))) node.firstChild.remove();
    while (node.lastChild && (node.lastChild.nodeName === "BR" || node.lastChild.nodeType === 3 && !clean6(node.lastChild.textContent))) node.lastChild.remove();
    return node;
  }
  function richContent(document, container) {
    const out = [];
    const blocks = [...container.querySelectorAll("p, ul, ol, h1, h2, h3, h4, h5, h6, table")].filter((n) => !n.parentElement.closest("p, ul, ol, h1, h2, h3, h4, h5, h6, table"));
    const sources = blocks.length ? blocks : clean6(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      let tag = "p";
      if (/^(UL|OL)$/.test(src.tagName)) tag = src.tagName.toLowerCase();
      else if (/^H[1-6]$/.test(src.tagName)) tag = "h4";
      if (src.tagName === "TABLE") {
        [...src.querySelectorAll("tr")].forEach((tr) => {
          const p = document.createElement("p");
          p.textContent = [...tr.children].map((c) => clean6(c.textContent)).filter(Boolean).join(" | ");
          if (p.textContent) out.push(p);
        });
        return;
      }
      const node = document.createElement(tag);
      node.innerHTML = src.innerHTML;
      sanitize(node);
      if (clean6(node.textContent.replace(/&nbsp;/g, " "))) out.push(node);
    });
    return out;
  }
  function textPara(document, text) {
    const p = document.createElement("p");
    p.textContent = clean6(text);
    return p;
  }
  function accordionRows(document, root, cfg) {
    const items = Array.isArray(cfg.accordionItems) ? cfg.accordionItems : [];
    if (items.length) {
      return items.map((item) => {
        const title = clean6(decodeHtml6(document, item.title).textContent);
        const content = richContent(document, decodeHtml6(document, item.content));
        return title ? [[textPara(document, title)], content] : null;
      }).filter(Boolean);
    }
    return [...root.querySelectorAll('[data-testid="accordion-item"]')].map((item) => {
      const trigger = item.querySelector("h3, button");
      const region = item.querySelector('[role="region"]');
      const title = clean6(trigger && trigger.textContent);
      return title ? [[textPara(document, title)], region ? richContent(document, region) : []] : null;
    }).filter(Boolean);
  }
  function rotatingTileRows(document, cfg) {
    return (cfg.tiles || []).map((tile) => {
      const title = clean6(decodeHtml6(document, tile.title).textContent);
      if (!title) return null;
      const content = [];
      if (tile.imagePath) {
        const img = document.createElement("img");
        img.src = absUrl6(tile.imagePath);
        img.alt = tile.imageDecorative ? "" : clean6(tile.imageAltText);
        content.push(img);
      }
      content.push(...richContent(document, decodeHtml6(document, tile.description)));
      const bullets = (tile.bulletpoints || []).map((b) => clean6(decodeHtml6(document, b.bulletpoint).textContent)).filter(Boolean);
      if (bullets.length) {
        const ul = document.createElement("ul");
        bullets.forEach((b) => {
          const li = document.createElement("li");
          li.textContent = b;
          ul.append(li);
        });
        content.push(ul);
      }
      if (tile.ctalink) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = absUrl6(tile.ctalink);
        a.textContent = clean6(tile.ctatitle || tile.ctaTitle) || a.href;
        p.append(a);
        content.push(p);
      }
      return [[textPara(document, title)], content];
    }).filter(Boolean);
  }
  function parse6(element, { document }) {
    const root = element.closest("div.accordion, div.rotatingtile") || element;
    if (!root.parentNode) return;
    const intro = [];
    let rows;
    const renderedTitle = root.querySelector("h2");
    const rotating = readConfig5(root, "rotatingtile");
    if (rotating || root.matches("div.rotatingtile")) {
      const cfg = rotating || {};
      const title = clean6(decodeHtml6(document, cfg.title).textContent) || clean6(renderedTitle && renderedTitle.textContent);
      if (title) {
        const h2 = document.createElement("h2");
        h2.textContent = title;
        intro.push(h2);
      }
      intro.push(...richContent(document, decodeHtml6(document, cfg.description)));
      rows = rotatingTileRows(document, cfg);
    } else {
      const cfg = readConfig5(root, "accordion") || {};
      const title = clean6(decodeHtml6(document, cfg.accordiontile).textContent) || clean6(renderedTitle && renderedTitle.textContent);
      if (title) {
        const h2 = document.createElement("h2");
        h2.textContent = title;
        intro.push(h2);
      }
      rows = accordionRows(document, root, cfg);
    }
    if (!rows.length && !intro.length) return;
    const out = [...intro];
    if (rows.length) out.push(WebImporter.Blocks.createBlock(document, { name: "accordion-divided", cells: rows }));
    root.replaceWith(...out);
  }

  // tools/importer/parsers/carousel-split.js
  var ORIGIN7 = "https://www.jll.com";
  function absUrl7(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN7).href;
    } catch (e) {
      return value;
    }
  }
  function clean7(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function decodeHtml7(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function richParagraphs4(document, container) {
    const out = [];
    const blocks = [...container.querySelectorAll("p, ul, ol")].filter((n) => !n.parentElement.closest("p, ul, ol"));
    const sources = blocks.length ? blocks : clean7(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : "p";
      const node = document.createElement(tag);
      node.innerHTML = src.innerHTML;
      node.querySelectorAll("span").forEach((span) => span.replaceWith(...span.childNodes));
      node.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl7(n.getAttribute("href")));
      });
      if (clean7(node.textContent)) out.push(node);
    });
    return out;
  }
  function visibleText3(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll("span").forEach((span) => {
      if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean7(span.textContent))) span.remove();
    });
    return clean7(copy.textContent);
  }
  function readConfig6(root, component) {
    const rc = root.matches && root.matches(`react-component[data-component="${component}"]`) ? root : root.querySelector(`react-component[data-component="${component}"][data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config"));
    } catch (e) {
      return null;
    }
  }
  function slidesFromConfig(document, config) {
    if (!config || !Array.isArray(config.tiles) || !config.tiles.length) return null;
    return {
      title: clean7(decodeHtml7(document, config.title).textContent),
      slides: config.tiles.map((tile) => ({
        image: tile.imageUrl || "",
        alt: tile.carouselNotDecorativeImage ? clean7(decodeHtml7(document, tile.imageAlt || tile.title).textContent) : "",
        eyebrow: clean7(decodeHtml7(document, tile.eyebrow).textContent),
        title: clean7(decodeHtml7(document, tile.title).textContent),
        description: richParagraphs4(document, decodeHtml7(document, tile.description)),
        ctaLabel: clean7(decodeHtml7(document, tile.ctaTitle).textContent),
        ctaUrl: tile.ctaLink || ""
      }))
    };
  }
  function slidesFromDom(document, root) {
    const slideEls = [...root.querySelectorAll(".swiper-wrapper > .swiper-slide")].filter((s) => !s.classList.contains("swiper-slide-duplicate"));
    if (!slideEls.length) return null;
    const titleEl = [...root.querySelectorAll("h2")].find((h) => !h.closest(".swiper-slide"));
    return {
      title: titleEl ? clean7(titleEl.textContent) : "",
      slides: slideEls.map((slide) => {
        const img = slide.querySelector("img");
        const heading = slide.querySelector("h1, h2, h3, h4, h5, h6");
        const eyebrow = heading && heading.previousElementSibling && heading.previousElementSibling.tagName === "P" ? heading.previousElementSibling : null;
        const desc = heading ? heading.nextElementSibling : null;
        const links = [...slide.querySelectorAll("a[href]")].filter((a) => !desc || !desc.contains(a));
        const cta = links[links.length - 1];
        return {
          image: img ? img.getAttribute("src") || "" : "",
          alt: img ? img.getAttribute("alt") || "" : "",
          eyebrow: eyebrow ? clean7(eyebrow.textContent) : "",
          title: heading ? clean7(heading.textContent) : "",
          description: desc ? richParagraphs4(document, desc) : [],
          ctaLabel: cta ? visibleText3(cta) : "",
          ctaUrl: cta ? cta.getAttribute("href") : ""
        };
      })
    };
  }
  function buildRow2(document, slide) {
    let media = "";
    if (slide.image) {
      const img = document.createElement("img");
      img.src = absUrl7(slide.image);
      img.alt = slide.alt || "";
      media = img;
    }
    const content = [];
    if (slide.eyebrow) {
      const p = document.createElement("p");
      p.textContent = slide.eyebrow;
      content.push(p);
    }
    if (slide.title) {
      const h3 = document.createElement("h3");
      h3.textContent = slide.title;
      content.push(h3);
    }
    content.push(...slide.description);
    if (slide.ctaUrl || slide.ctaLabel) {
      const p = document.createElement("p");
      if (slide.ctaUrl) {
        const a = document.createElement("a");
        a.href = absUrl7(slide.ctaUrl);
        a.textContent = slide.ctaLabel || "Read more";
        p.append(a);
      } else {
        p.textContent = slide.ctaLabel;
      }
      content.push(p);
    }
    return [media, content];
  }
  function parse7(element, { document }) {
    if (!element.parentNode) return;
    if (element.querySelector("table") && !element.querySelector(".swiper-slide")) return;
    const root = element.closest("div.carouselsingledouble") || element;
    const data = slidesFromConfig(document, readConfig6(root, "carouselsingledouble")) || slidesFromDom(document, element);
    if (!data || !data.slides.length) return;
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
    const slides = data.slides.filter((s) => s.image || s.title || s.eyebrow || s.description.length);
    if (!slides.length) return;
    const cells = slides.map((slide) => buildRow2(document, slide));
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-split", cells });
    if (data.title) {
      const h2 = document.createElement("h2");
      h2.textContent = data.title;
      element.replaceWith(h2, block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/parsers/form.js
  var FORM_DEFINITION = "https://main--jll-ai--dzepeda601.aem.live/forms/contact-us.json";
  var FORM_SUBMIT = "https://demo.bbird.live/contact-us/";
  function linkCell(document, href) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = href;
    return [a];
  }
  function parse8(element, { document }) {
    const root = element.closest("div.eloquaform") || element;
    if (!root.parentNode) return;
    const cells = [
      [linkCell(document, FORM_DEFINITION)],
      [linkCell(document, FORM_SUBMIT)]
    ];
    const block = WebImporter.Blocks.createBlock(document, { name: "form", cells });
    root.replaceWith(block);
  }

  // tools/importer/transformers/jll-cleanup.js
  var ICON_NAMES = /* @__PURE__ */ new Set([
    "arrow_forward",
    "arrow_back",
    "arrow_downward",
    "arrow_upward",
    "chevron_left",
    "chevron_right",
    "play_arrow",
    "pause",
    "open_in_new",
    "expand_more",
    "expand_less",
    "keyboard_arrow_down",
    "keyboard_arrow_up",
    "search",
    "menu",
    "close",
    "north_east"
  ]);
  function removeAll(root, selectors) {
    selectors.forEach((sel) => {
      root.querySelectorAll(sel).forEach((el2) => el2.remove());
    });
  }
  function removeIconSpans(root) {
    root.querySelectorAll("span").forEach((span) => {
      if (span.children.length) return;
      const text = (span.textContent || "").trim();
      if (ICON_NAMES.has(text)) span.remove();
    });
  }
  function removeSlideAnnouncements(root) {
    removeAll(root, [".swiper-notification", ".swiper-pagination"]);
    root.querySelectorAll("[aria-live]").forEach((el2) => {
      if (!el2.children.length) el2.remove();
    });
    root.querySelectorAll("div, span, p").forEach((el2) => {
      if (el2.children.length) return;
      if (/^Slide \d+ of \d+/i.test((el2.textContent || "").trim())) el2.remove();
    });
  }
  function normalizeScene7Images(root) {
    root.querySelectorAll("img").forEach((img) => {
      let src = img.getAttribute("src") || "";
      if (!src.includes("/is/image/")) return;
      if (src.startsWith("//")) src = `https:${src}`;
      try {
        const url = new URL(src, "https://s7d1.scene7.com");
        const keep = url.search.replace(/^\?/, "").split("&").filter((p) => p && !/^(wid|hei|fmt|fit)=/.test(p));
        keep.push("fit=constrain,0", "wid=1600", "fmt=jpg");
        img.setAttribute("src", `${url.origin}${url.pathname}?${keep.join("&")}`);
      } catch (e) {
      }
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.removeAttribute("loading");
      const picture = img.closest("picture");
      if (picture) picture.querySelectorAll("source").forEach((s) => s.remove());
    });
  }
  function useDamWebRenditions(root) {
    root.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!/^https:\/\/www\.jll\.com\/content\/dam\/[^?#]+\.(jpe?g|png)(\?[^#]*)?$/i.test(src)) return;
      const base = src.split("?")[0];
      img.setAttribute("src", `${base}/jcr:content/renditions/cq5dam.web.1280.1280.jpeg`);
    });
  }
  function transform(hookName, element, payload) {
    const root = element;
    if (hookName === "beforeTransform") {
      removeAll(root, [
        ".cmp-experiencefragment--header",
        "div.experiencefragment:has(.cmp-experiencefragment--header)",
        "footer.experiencefragment",
        ".cmp-experiencefragment--footer",
        "header",
        "footer",
        ".cmp-page__skiptomaincontent",
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk",
        "#onetrust-pc-sdk",
        ".onetrust-pc-dark-filter",
        "iframe.ot-text-resize",
        // Qualtrics site-intercept survey popup ("Share your feedback")
        '[class^="QSI"]',
        '[id^="QSI"]',
        '[class*=" QSI"]'
      ]);
      root.querySelectorAll("div.experiencefragment").forEach((el2) => {
        if (!el2.textContent.trim() && !el2.querySelector("img")) el2.remove();
      });
      removeAll(root, [
        "div.spotlightbroadcaster",
        "div.ghost"
      ]);
      root.querySelectorAll("div.embed").forEach((el2) => {
        if (!el2.querySelector("iframe, img, video, a") && !el2.textContent.trim()) el2.remove();
      });
      root.querySelectorAll("react-component").forEach((rc) => {
        if (rc.hasAttribute("data-config")) return;
        if (!rc.children.length && !rc.textContent.trim()) {
          const wrapper = rc.parentElement;
          rc.remove();
          if (wrapper && wrapper.matches("div.aem-GridColumn") && !wrapper.children.length && !wrapper.textContent.trim()) {
            wrapper.remove();
          }
        }
      });
      removeAll(root, [
        ".carousel-panel__nav-buttons",
        ".carousel-panel__nav-button-prev",
        ".carousel-panel__nav-button-next",
        ".swiper-button-prev",
        ".swiper-button-next"
      ]);
      removeSlideAnnouncements(root);
      removeIconSpans(root);
      removeAll(root, ["script", "style", "noscript", "link"]);
    }
    if (hookName === "afterTransform") {
      removeIconSpans(root);
      removeSlideAnnouncements(root);
      removeAll(root, [
        "header",
        "footer",
        "#onetrust-consent-sdk",
        ".cmp-page__skiptomaincontent",
        "iframe",
        "script",
        "style",
        "noscript",
        "link",
        "source",
        '[class^="QSI"]',
        '[id^="QSI"]',
        '[class*=" QSI"]'
      ]);
      root.querySelectorAll('img[src*="qualtrics.com"]').forEach((img) => {
        const container = img.closest("p, div") || img;
        const prev = container.previousElementSibling;
        if (prev && prev.tagName === "P" && /share your feedback/i.test(prev.textContent)) prev.remove();
        container.remove();
      });
      root.querySelectorAll("*").forEach((el2) => {
        [...el2.attributes].forEach((attr) => {
          const n = attr.name;
          if (n.startsWith("data-cmp-") || n.startsWith("data-analytics") || n.startsWith("data-track") || n === "data-config" || n === "data-component" || n === "data-state" || n === "onclick") {
            el2.removeAttribute(n);
          }
        });
      });
      normalizeScene7Images(root);
      useDamWebRenditions(root);
    }
  }

  // tools/importer/transformers/service-overview-cleanup.js
  var TEMPLATE = "service-overview";
  var DETAIL_TEMPLATE = "service-detail";
  var LANDING_TEMPLATE = "service-landing";
  var DESIGN_TEMPLATE = "service-design";
  var HUB_TEMPLATE = "services-hub";
  var STYLE_MARK = "data-excat-style";
  var ANCHORS_MARK = "data-excat-anchors";
  var CONTACT_KEY = " contact";
  var ORIGIN8 = "https://www.jll.com";
  var PIN_HREF2 = "data-excat-href";
  var PIN_LABEL2 = "data-excat-label";
  var CONTACT_MARK = "data-excat-contact";
  var CONTACT_ANCHORS = ["input-form", "contactus", "contact-us", "get-started", "contact"];
  var SITE_HOSTS = ["www.jll.com", "jll.com"];
  var SITE_LOCALE = /^\/en-us(\/|$)/i;
  var AEM_SITE_ROOT = /^\/content\/jll-com-phoenix\/country\/amer\/us\/en(\/|$)/i;
  function clean8(text) {
    return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
  function absUrl8(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN8).href;
    } catch (e) {
      return value;
    }
  }
  function decodeHtml8(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function richParagraphs5(document, container, keepHeadings = false) {
    const out = [];
    const sel = keepHeadings ? "p, ul, ol, h1, h2, h3, h4, h5, h6" : "p, ul, ol";
    const blocks = [...container.querySelectorAll(sel)].filter((n) => !n.parentElement.closest(sel));
    const sources = blocks.length ? blocks : clean8(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      let tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : "p";
      if (keepHeadings && /^H[1-6]$/.test(src.tagName)) tag = "h3";
      const node = document.createElement(tag);
      node.innerHTML = src.innerHTML;
      node.querySelectorAll("span, font").forEach((n) => n.replaceWith(...n.childNodes));
      node.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl8(n.getAttribute("href")));
      });
      if (clean8(node.textContent)) out.push(node);
    });
    return out;
  }
  function readConfig7(root, component) {
    const sel = `react-component[data-component="${component}"]`;
    const rc = root.matches(sel) ? root : root.querySelector(`${sel}[data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config") || "null");
    } catch (e) {
      return null;
    }
  }
  function slugify(text) {
    return clean8(text).toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
  }
  function isTemplate(payload) {
    const name = payload && payload.template && payload.template.name;
    return !name || name === TEMPLATE || name === DETAIL_TEMPLATE || name === LANDING_TEMPLATE || name === DESIGN_TEMPLATE || name === HUB_TEMPLATE;
  }
  function isDetail(payload) {
    const name = payload && payload.template && payload.template.name;
    return name === DETAIL_TEMPLATE || name === LANDING_TEMPLATE || name === DESIGN_TEMPLATE;
  }
  function isLanding(payload) {
    const name = payload && payload.template && payload.template.name;
    return name === LANDING_TEMPLATE || name === DESIGN_TEMPLATE;
  }
  function isDesign(payload) {
    return Boolean(payload && payload.template && payload.template.name === DESIGN_TEMPLATE);
  }
  function mapAemSitePaths(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      let url;
      try {
        url = new URL(href, `${ORIGIN8}/`);
      } catch (e) {
        return;
      }
      const isAbsolute = /^(https?:)?\/\//i.test(href);
      if (isAbsolute && !SITE_HOSTS.includes(url.hostname.toLowerCase())) return;
      if (!AEM_SITE_ROOT.test(url.pathname)) return;
      const path = url.pathname.replace(AEM_SITE_ROOT, "/en-us$1").replace(/\/$/, "");
      a.setAttribute("href", `${path}${url.search}${url.hash}`);
    });
  }
  function convertSectionHeadings(document, root) {
    root.querySelectorAll("div.sectionheading").forEach((node) => {
      const cfg = readConfig7(node, "sectionheading");
      const lines = (cfg && Array.isArray(cfg.titles) ? cfg.titles : []).map((t) => clean8(decodeHtml8(document, t).textContent)).filter(Boolean);
      const rendered = node.querySelector("h1, h2, h3");
      const title = lines.length ? lines.join(" ") : clean8(rendered && rendered.textContent);
      if (!title) {
        node.remove();
        return;
      }
      const h2 = document.createElement("h2");
      h2.textContent = title;
      node.replaceChildren(h2);
    });
  }
  function pinEmptyLinks(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
      if (clean8(a.textContent) || a.querySelector("img, picture, video")) return;
      const parent = a.parentElement;
      if (!parent || parent.hasAttribute(PIN_HREF2)) return;
      parent.setAttribute(PIN_HREF2, a.getAttribute("href"));
      const label = a.getAttribute("aria-label");
      if (label) parent.setAttribute(PIN_LABEL2, label);
    });
  }
  function revealVideos(root, detail = false) {
    return __async(this, null, function* () {
      const win = root.ownerDocument && root.ownerDocument.defaultView;
      if (!win || typeof win.scrollTo !== "function") return;
      const configOf = (host) => (host.querySelector("react-component[data-config]") || { getAttribute: () => "" }).getAttribute("data-config") || "";
      const hosts = [...root.querySelectorAll("div.banner, div.hero, div.carouselsingledouble")].filter((host) => /"(mediaType"\s*:\s*"video|withVideo"\s*:\s*true)/.test(configOf(host)));
      if (detail) {
        hosts.push(...[...root.querySelectorAll("div.featuredtile")].filter((host) => /"videoPlayer"\s*:\s*"\d+/.test(configOf(host))));
      }
      const wait = (ms) => new Promise((resolve) => {
        win.setTimeout(resolve, ms);
      });
      for (const host of hosts) {
        host.scrollIntoView({ block: "center" });
        const start = Date.now();
        while (Date.now() - start < 6e3) {
          const video = host.querySelector("video[poster]");
          const title = host.querySelector(".vjs-dock-title");
          if (video && video.getAttribute("poster") && (!host.querySelector("video-js") || title && clean8(title.textContent))) break;
          yield wait(250);
        }
      }
      win.scrollTo(0, 0);
    });
  }
  function removeEmptyComponents(root, detail = false) {
    root.querySelectorAll("div.banner.aem-GridColumn").forEach((banner) => {
      const cfg = readConfig7(banner, "banner");
      let empty = !cfg || !cfg.bannerType;
      if (detail && !empty && cfg.bannerType === "message") {
        empty = !clean8(cfg.messageTitle) && !clean8(cfg.messageDescription) && !clean8(cfg.messageButtonTitle);
      }
      if (detail && !empty && cfg.bannerType === "fullwidthmessage") {
        empty = !clean8(cfg.fullWidthMessageTitle) && !clean8(cfg.label);
      }
      if (empty || cfg.hideBanner === true || cfg.hideBanner === "true") banner.remove();
    });
    root.querySelectorAll("div.jumppoint.aem-GridColumn").forEach((jp) => {
      const cfg = readConfig7(jp, "jumppoint");
      const hasLinks = cfg && Array.isArray(cfg.destinations) && cfg.destinations.length;
      if (!hasLinks && !clean8(jp.textContent)) jp.remove();
    });
    root.querySelectorAll("div.accordion.aem-GridColumn").forEach((acc) => {
      const cfg = readConfig7(acc, "accordion");
      const hasItems = cfg && Array.isArray(cfg.accordionItems) && cfg.accordionItems.length;
      if (!hasItems && !clean8(acc.textContent)) acc.remove();
    });
  }
  function normalizeEditorials(document, root, detail = false) {
    root.querySelectorAll("div.editorial.aem-GridColumn").forEach((editorial) => {
      const cfg = readConfig7(editorial, "editorial");
      const nodes = [];
      const renderedTitle = editorial.querySelector("h1, h2, h3");
      const title = cfg && cfg.title ? clean8(decodeHtml8(document, cfg.title).textContent) : clean8(renderedTitle && renderedTitle.textContent);
      let h2 = null;
      if (title) {
        h2 = document.createElement("h2");
        h2.textContent = title;
        nodes.push(h2);
      }
      if (cfg && cfg.text) {
        nodes.push(...richParagraphs5(document, decodeHtml8(document, cfg.text), detail));
      } else {
        [...editorial.querySelectorAll("p")].forEach((p) => {
          if (!clean8(p.textContent)) return;
          const copy = document.createElement("p");
          copy.textContent = clean8(p.textContent);
          nodes.push(copy);
        });
      }
      let next = editorial.nextElementSibling;
      while (next && next.tagName !== "DIV") next = next.nextElementSibling;
      if (h2 && next && next.matches("div.eloquaform")) {
        h2.setAttribute(CONTACT_MARK, cfg && cfg.anchorId || "contact");
      }
      if (!nodes.length) {
        editorial.remove();
        return;
      }
      editorial.replaceChildren(...nodes);
    });
  }
  function ctaParagraph(document, label, href) {
    if (!clean8(label) || !href) return null;
    const p = document.createElement("p");
    const a = document.createElement("a");
    a.href = absUrl8(href);
    a.textContent = clean8(label);
    p.append(a);
    return p;
  }
  function convertFullWidthMessages(document, root) {
    root.querySelectorAll("div.banner.aem-GridColumn").forEach((banner) => {
      const cfg = readConfig7(banner, "banner");
      if (!cfg || cfg.bannerType !== "fullwidthmessage") return;
      const nodes = [];
      const title = clean8(decodeHtml8(document, cfg.fullWidthMessageTitle).textContent);
      if (title) {
        const p = document.createElement("p");
        p.textContent = title;
        nodes.push(p);
      }
      const cta = ctaParagraph(document, cfg.label || cfg.accessibilityLabel, cfg.url);
      if (cta) nodes.push(cta);
      banner.replaceChildren(...nodes);
      banner.setAttribute(STYLE_MARK, "statement");
    });
  }
  function convertSecondaryNav(document, root) {
    root.querySelectorAll("div.secondarynavigation").forEach((nav) => {
      const cfg = readConfig7(nav, "secondarynavigation");
      const items = (cfg && Array.isArray(cfg.ctas) ? cfg.ctas : []).map((c) => ({ label: clean8(c.ctatitle || c.accessibilitylabel), href: c.ctaurl })).filter((c) => c.label && c.href);
      if (!items.length) {
        nav.remove();
        return;
      }
      const ul = document.createElement("ul");
      items.forEach(({ label, href }) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.setAttribute("href", href);
        a.textContent = label;
        li.append(a);
        ul.append(li);
      });
      nav.replaceChildren(ul);
      nav.setAttribute(STYLE_MARK, "link-bar");
    });
  }
  function collectAnchors(document, root) {
    const anchors = {};
    const seen = {};
    const ids = /* @__PURE__ */ new Map();
    root.querySelectorAll("h1, h2").forEach((h) => {
      const base = slugify(h.textContent);
      if (!base) return;
      const n = seen[base] || 0;
      seen[base] = n + 1;
      ids.set(h, n ? `${base}-${n}` : base);
    });
    root.querySelectorAll("react-component[data-config]").forEach((rc) => {
      let cfg;
      try {
        cfg = JSON.parse(rc.getAttribute("data-config") || "null");
      } catch (e) {
        cfg = null;
      }
      const id = cfg && clean8(cfg.anchorId);
      if (!id || anchors[id]) return;
      const host = rc.closest("div.aem-GridColumn") || rc;
      const heading = host.querySelector("h1, h2");
      const titleSrc = heading && heading.textContent || cfg.title || cfg.maintitle || cfg.accordiontile || "";
      const slug = heading && ids.get(heading) || slugify(decodeHtml8(document, titleSrc).textContent);
      if (slug) anchors[id] = slug;
    });
    const contact = [...root.querySelectorAll("div.editorial.aem-GridColumn")].find((ed) => {
      let next = ed.nextElementSibling;
      while (next && next.tagName !== "DIV") next = next.nextElementSibling;
      return next && next.matches("div.eloquaform");
    });
    const contactHeading = contact && contact.querySelector("h1, h2");
    if (contactHeading && ids.get(contactHeading)) anchors[CONTACT_KEY] = ids.get(contactHeading);
    if (Object.keys(anchors).length) root.setAttribute(ANCHORS_MARK, JSON.stringify(anchors));
  }
  function readAnchors(root) {
    try {
      return JSON.parse(root.getAttribute(ANCHORS_MARK) || "null");
    } catch (e) {
      return null;
    }
  }
  function rewriteComponentAnchors(root, pageUrl) {
    const anchors = readAnchors(root);
    if (!anchors) return;
    const normalize = (p) => p.replace(/\.html?$/i, "").replace(/\/$/, "");
    let pagePath = "";
    try {
      pagePath = normalize(new URL(pageUrl).pathname);
    } catch (e) {
    }
    root.querySelectorAll('a[href*="#"]').forEach((a) => {
      const href = a.getAttribute("href");
      let url;
      try {
        url = new URL(href, pageUrl || `${ORIGIN8}/`);
      } catch (e) {
        return;
      }
      const target = anchors[url.hash.replace(/^#/, "")];
      if (!target) return;
      const samePage = href.startsWith("#") || /^\/#/.test(href) || pagePath && normalize(url.pathname) === pagePath;
      if (samePage) a.setAttribute("href", `#${target}`);
    });
  }
  function rewriteContactAnchors(root, pageUrl, contactId = "") {
    const heading = root.querySelector(`[${CONTACT_MARK}]`);
    if (!heading) return;
    const anchors = new Set(CONTACT_ANCHORS);
    anchors.add(heading.getAttribute(CONTACT_MARK));
    const id = contactId || slugify(heading.textContent);
    if (!id) return;
    const normalize = (p) => p.replace(/\.html?$/i, "").replace(/\/$/, "");
    let pagePath = "";
    try {
      pagePath = normalize(new URL(pageUrl).pathname);
    } catch (e) {
    }
    root.querySelectorAll('a[href*="#"]').forEach((a) => {
      const href = a.getAttribute("href");
      let url;
      try {
        url = new URL(href, pageUrl || `${ORIGIN8}/`);
      } catch (e) {
        return;
      }
      if (!anchors.has(url.hash.replace(/^#/, ""))) return;
      const samePage = href.startsWith("#") || pagePath && normalize(url.pathname) === pagePath;
      if (samePage) a.setAttribute("href", `#${id}`);
    });
  }
  function relativizeLinks(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      const isAbsolute = /^(https?:)?\/\//i.test(href);
      const isRootRelative = href.startsWith("/") && !href.startsWith("//");
      if (!isAbsolute && !isRootRelative) return;
      let url;
      try {
        url = new URL(href, `${ORIGIN8}/`);
      } catch (e) {
        return;
      }
      if (isAbsolute && !SITE_HOSTS.includes(url.hostname.toLowerCase())) return;
      if (!SITE_LOCALE.test(url.pathname)) return;
      const path = url.pathname.replace(/\.html?$/i, "");
      a.setAttribute("href", `${path}${url.search}${url.hash}`);
    });
  }
  function transform2(hookName, element, payload) {
    if (!isTemplate(payload)) return;
    const document = element.ownerDocument;
    if (hookName === "preprocess") {
      return revealVideos(element, isDetail(payload)).catch(() => {
      }).then(() => pinEmptyLinks(element));
    }
    const detail = isDetail(payload);
    if (hookName === "beforeTransform") {
      element.querySelectorAll("div.spacer, div.separator, div.ghost").forEach((n) => n.remove());
      if (detail) collectAnchors(document, element);
      removeEmptyComponents(element, detail);
      if (detail) {
        convertFullWidthMessages(document, element);
        convertSecondaryNav(document, element);
      }
      if (isLanding(payload)) convertSectionHeadings(document, element);
      normalizeEditorials(document, element, detail);
    }
    if (hookName === "afterTransform") {
      const pageUrl = payload && payload.params && payload.params.originalURL || payload && payload.url || "";
      if (detail) rewriteComponentAnchors(element, pageUrl);
      rewriteContactAnchors(element, pageUrl, detail ? (readAnchors(element) || {})[CONTACT_KEY] || "" : "");
      if (isDesign(payload)) mapAemSitePaths(element);
      relativizeLinks(element);
      element.querySelectorAll(`[${PIN_HREF2}], [${PIN_LABEL2}], [${CONTACT_MARK}]`).forEach((n) => {
        n.removeAttribute(PIN_HREF2);
        n.removeAttribute(PIN_LABEL2);
        n.removeAttribute(CONTACT_MARK);
      });
      if (detail) {
        element.removeAttribute(ANCHORS_MARK);
        element.querySelectorAll(`[${STYLE_MARK}]`).forEach((n) => n.removeAttribute(STYLE_MARK));
      }
    }
  }

  // tools/importer/transformers/service-overview-sections.js
  var TEMPLATE2 = "service-overview";
  var DETAIL_TEMPLATE2 = "service-detail";
  var LANDING_TEMPLATE2 = "service-landing";
  var DESIGN_TEMPLATE2 = "service-design";
  var HUB_TEMPLATE2 = "services-hub";
  var STYLE_MARK2 = "data-excat-style";
  var OWN_STYLE = "style:";
  var MARKER = "data-excat-section-id";
  var LAYOUT_ONLY = "div.spacer, div.separator, div.ghost";
  function isTemplate2(payload) {
    const name = payload && payload.template && payload.template.name;
    return name === TEMPLATE2 || name === DETAIL_TEMPLATE2 || name === LANDING_TEMPLATE2 || name === DESIGN_TEMPLATE2 || name === HUB_TEMPLATE2;
  }
  function isSideBanner(node) {
    return Boolean(node && node.matches("div.banner") && node.querySelector('.c-side-content, react-component[data-component="banner"]') && /"bannerType"\s*:\s*"sideContent"/.test((node.querySelector("react-component[data-config]") || { getAttribute: () => "" }).getAttribute("data-config") || ""));
  }
  function components(root) {
    return [...root.querySelectorAll("div.aem-Grid > div")].filter((node) => {
      if (node.matches(LAYOUT_ONLY)) return false;
      if (node.querySelector(":scope > div.cmp-container > div.aem-Grid, :scope > div.aem-Grid")) return false;
      const outer = node.parentElement && node.parentElement.closest("div.aem-Grid > div");
      if (outer && !outer.querySelector(":scope > div.cmp-container > div.aem-Grid, :scope > div.aem-Grid")) return false;
      return true;
    });
  }
  function styleFor(node, sections, detail = false) {
    const own = detail && node.getAttribute(STYLE_MARK2);
    if (own) return { id: `${OWN_STYLE}${own}`, style: own };
    const match = sections.find((section) => section.style && (section.selector || []).some((sel) => {
      try {
        return node.matches(sel);
      } catch (e) {
        return false;
      }
    }));
    return match || null;
  }
  function transform3(hookName, element, payload) {
    if (!isTemplate2(payload)) return;
    const document = element.ownerDocument;
    const sections = Array.isArray(payload.template.sections) ? payload.template.sections : [];
    const landing = payload.template.name === LANDING_TEMPLATE2 || payload.template.name === DESIGN_TEMPLATE2;
    const detail = payload.template.name === DETAIL_TEMPLATE2 || landing;
    if (hookName === "beforeTransform") {
      const list = components(element);
      list.forEach((node, i) => {
        const prev = list[i - 1];
        const styled = styleFor(node, sections, detail);
        if (i === 0) {
          if (styled) {
            const hr2 = document.createElement("hr");
            hr2.setAttribute(MARKER, styled.id);
            hr2.setAttribute("data-excat-first-section", "true");
            node.before(hr2);
          }
          return;
        }
        if (node.matches("div.eloquaform") && prev && prev.matches("div.editorial")) return;
        if (isSideBanner(node) && isSideBanner(prev)) return;
        if (detail && node.matches("div.featuredtile") && prev && prev.matches("div.editorial")) return;
        if (landing && prev && prev.matches("div.sectionheading")) {
          const hr2 = prev.previousElementSibling;
          if (styled && hr2 && hr2.tagName === "HR" && !hr2.hasAttribute(MARKER)) hr2.setAttribute(MARKER, styled.id);
          return;
        }
        const hr = document.createElement("hr");
        if (styled) hr.setAttribute(MARKER, styled.id);
        node.before(hr);
      });
    }
    if (hookName === "afterTransform") {
      [...element.querySelectorAll(`hr[${MARKER}]`)].forEach((hr) => {
        const marker = hr.getAttribute(MARKER) || "";
        const section = detail && marker.startsWith(OWN_STYLE) ? { style: marker.slice(OWN_STYLE.length) } : sections.find((s) => s.id === marker);
        if (section && section.style) {
          const metadata = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          hr.after(metadata);
        }
        hr.removeAttribute(MARKER);
        if (hr.hasAttribute("data-excat-first-section")) hr.remove();
      });
    }
  }

  // tools/importer/import-service-overview.js
  var PAGE_TEMPLATE = {
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
          'react-component[data-component="hero"]'
        ]
      },
      {
        "name": "cards-stats",
        "instances": [
          "div.stats.aem-GridColumn",
          'react-component[data-component="stats"]'
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
  var parsers = {
    "hero-split": parse,
    "cards-stats": parse2,
    "cards-eyebrow": parse3,
    "hero-photo-panel": parse4,
    "columns-alternating": parse5,
    "accordion-divided": parse6,
    "carousel-split": parse7,
    form: parse8
  };
  var sectionTransformers = [transform3];
  var fragmentTransformers = [];
  var lateTransformers = [...sectionTransformers, ...fragmentTransformers];
  var transformers = [transform, transform2, ...lateTransformers];
  var earlyTransformers = transformers.filter((fn) => !lateTransformers.includes(fn));
  var CATALOG = Boolean(PAGE_TEMPLATE.pageCleanup || PAGE_TEMPLATE.blocks.some((b) => b.pageInstances));
  function executeTransformers(hookName, element, payload, list = transformers) {
    var _a, _b;
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: ((_b = (_a = payload.params) == null ? void 0 : _a.targets) == null ? void 0 : _b.template) || PAGE_TEMPLATE });
    list.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template, url) {
    const pageBlocks = [];
    const pageKey = (u) => {
      try {
        const { origin, pathname } = new URL(u);
        return `${origin}${pathname.replace(/\/$/, "")}`;
      } catch (e) {
        return u;
      }
    };
    const key = pageKey(url);
    const claim = (blockDef, selector) => {
      let matches = [];
      try {
        matches = document.querySelectorAll(selector);
      } catch (e) {
        return;
      }
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
  function markPageTargets(payload) {
    const { document, params } = payload;
    executeTransformers("beforeTransform", document.body, payload, earlyTransformers);
    const blocks = findBlocksOnPage(document, PAGE_TEMPLATE, params.originalURL).map(({ name, selector, element }, i) => {
      element.setAttribute("data-excat-block", String(i));
      return { name, selector };
    });
    const sections = (PAGE_TEMPLATE.sections || []).map((section, i) => {
      const target = (section.selector || []).map((s) => {
        try {
          return document.querySelector(s);
        } catch (e) {
          return null;
        }
      }).find(Boolean);
      if (!target) return section;
      target.setAttribute("data-excat-section", String(i));
      return __spreadProps(__spreadValues({}, section), { selector: [`[data-excat-section="${i}"]`] });
    });
    params.targets = { blocks, template: __spreadProps(__spreadValues({}, PAGE_TEMPLATE), { sections }) };
  }
  var import_service_overview_default = {
    preprocess: (payload) => __async(null, null, function* () {
      const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
      yield Promise.all(earlyTransformers.map((fn) => __async(null, null, function* () {
        try {
          yield fn("preprocess", payload.document.body, enhancedPayload);
        } catch (e) {
          console.error("Transformer failed at preprocess:", e);
        }
      })));
      if (CATALOG) markPageTargets(payload);
    }),
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      params.fragments = [];
      if (!params.targets) markPageTargets(payload);
      const pageBlocks = params.targets.blocks.map((block, i) => __spreadProps(__spreadValues({}, block), { element: document.querySelector(`[data-excat-block="${i}"]`) })).filter((block) => block.element);
      executeTransformers("beforeTransform", main, __spreadProps(__spreadValues({}, payload), { pageBlocks }), lateTransformers);
      pageBlocks.forEach((block) => {
        if (!main.contains(block.element)) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      params.fragments.forEach(({ element }) => {
        executeTransformers("afterTransform", element, payload, earlyTransformers);
        WebImporter.rules.transformBackgroundImages(element, document);
        WebImporter.rules.adjustImageUrls(element, url, params.originalURL);
      });
      const { pathname } = new URL(params.originalURL);
      const rawPath = (pathname.endsWith("/") ? `${pathname}index` : pathname).replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath);
      return [{
        element: main,
        path,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }, ...params.fragments];
    }
  };
  return __toCommonJS(import_service_overview_exports);
})();
