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

  // tools/importer/import-services-hub.js
  var import_services_hub_exports = {};
  __export(import_services_hub_exports, {
    default: () => import_services_hub_default
  });

  // tools/importer/parsers/cards-eyebrow.js
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
      image.src = absUrl(img.getAttribute("src"));
      image.alt = img.getAttribute("alt") || "";
      imageCell = image;
    }
    const content = [];
    if (eyebrow && clean(eyebrow.textContent)) content.push(el(document, "p", clean(eyebrow.textContent)));
    if (heading) content.push(el(document, "h3", clean(heading.textContent)));
    if (desc && clean(desc.textContent)) content.push(el(document, "p", clean(desc.textContent)));
    if (link) {
      const p = document.createElement("p");
      const a = el(document, "a", clean(link.getAttribute("aria-label")) || "Read more");
      a.href = absUrl(link.getAttribute("href"));
      p.append(a);
      content.push(p);
    }
    return content.length ? [imageCell, content] : null;
  }
  var PIN_HREF = "data-excat-href";
  var PIN_LABEL = "data-excat-label";
  function decodeHtml(document, str) {
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
    const sources = blocks.length ? blocks : clean(container.textContent) ? [container] : [];
    return sources.map((src) => {
      const p = document.createElement("p");
      p.innerHTML = src.innerHTML;
      p.querySelectorAll("span, font, div").forEach((n) => n.replaceWith(...n.childNodes));
      p.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl(n.getAttribute("href")));
      });
      return p;
    }).filter((p) => clean(p.textContent));
  }
  function linkPara(document, href, label) {
    const p = document.createElement("p");
    const a = el(document, "a", clean(label) || absUrl(href));
    a.href = absUrl(href);
    p.append(a);
    return p;
  }
  function cardLink(card) {
    const pinned = card.matches(`[${PIN_HREF}]`) ? card : card.querySelector(`[${PIN_HREF}]`);
    if (pinned) return { href: pinned.getAttribute(PIN_HREF), label: pinned.getAttribute(PIN_LABEL) || "" };
    const a = [...card.querySelectorAll("a[href]")].find((x) => !x.closest('ul, [data-testid$="__tags"]'));
    return a ? { href: a.getAttribute("href"), label: a.getAttribute("aria-label") || clean(a.textContent) } : null;
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
      const title = clean(decodeHtml(document, item.title).textContent);
      const content = [];
      if (title) content.push(el(document, "h3", title));
      content.push(...descParagraphs(document, decodeHtml(document, item.description)));
      if (item.ctaLink) content.push(linkPara(document, item.ctaLink, title));
      return content.length ? [content] : null;
    }).filter(Boolean);
  }
  function tileRowsFromDom(document, root) {
    return renderedItems(root).map((item) => {
      const h3 = item.querySelector("h3");
      const title = clean(h3 && h3.textContent);
      const content = [];
      if (title) content.push(el(document, "h3", title));
      const desc = item.querySelector('.description, [data-testid$="__description"]');
      if (desc && clean(desc.textContent)) content.push(el(document, "p", clean(desc.textContent)));
      const tags = [...item.querySelectorAll("ul a[href]")];
      if (tags.length) {
        const ul = document.createElement("ul");
        tags.forEach((tag) => {
          const li = document.createElement("li");
          const a = el(document, "a", clean(tag.textContent));
          a.href = absUrl(tag.getAttribute("href"));
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
      const title = clean(h3 && h3.textContent);
      const img = item.querySelector("img");
      let imageCell = "";
      if (img && img.getAttribute("src") && !/^data:/.test(img.getAttribute("src"))) {
        const image = document.createElement("img");
        image.src = absUrl(img.getAttribute("src")).replace(/^http:\/\//i, "https://");
        image.alt = img.getAttribute("alt") || "";
        imageCell = image;
      }
      const content = [];
      const eyebrow = item.querySelector('[data-testid$="__content-preheader"]') || [...item.querySelectorAll("p")].find((p) => h3 && p.compareDocumentPosition(h3) & 4);
      if (eyebrow && clean(eyebrow.textContent)) content.push(el(document, "p", clean(eyebrow.textContent)));
      if (title) content.push(el(document, "h3", title));
      let details = [...item.querySelectorAll('[data-testid$="__content-body"], [data-testid$="__footer-text"]')];
      if (!details.length && h3) {
        details = [...item.querySelectorAll("div.wrap-anywhere, div.text-sm")].filter((d) => h3.compareDocumentPosition(d) & 4 && !d.querySelector("div.wrap-anywhere, div.text-sm"));
      }
      details.forEach((d) => {
        if (clean(d.textContent)) content.push(el(document, "p", clean(d.textContent)));
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
    const title = clean(decodeHtml(document, cfg.title).textContent) || clean(renderedTitle && renderedTitle.textContent);
    if (title && cfg.hideTitle !== true) {
      const h2 = document.createElement("h2");
      if (cfg.titleCtaPath) {
        const a = el(document, "a", title);
        a.href = absUrl(cfg.titleCtaPath);
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
    const title = clean(decodeHtml(document, cfg.title).textContent) || clean(renderedTitle && renderedTitle.textContent);
    if (title) out.push(el(document, "h2", title));
    out.push(...descParagraphs(document, decodeHtml(document, cfg.description)));
    const primary = cfg.ctaUrl ? [cfg.ctaTitle, cfg.ctaUrl] : [cfg.primaryCtaLabel, cfg.primaryCtaUrl];
    [primary, [cfg.secondaryCtaLabel, cfg.secondaryCtaUrl]].forEach(([label, href]) => {
      if (clean(label) && href) out.push(linkPara(document, href, label));
    });
    let cells = [];
    if (Array.isArray(cfg.destinations) && cfg.destinations.length) {
      cells = cfg.destinations.map((d) => {
        const name = clean(decodeHtml(document, d.title).textContent);
        const content = [];
        if (name) content.push(el(document, "h3", name));
        content.push(...descParagraphs(document, decodeHtml(document, d.description)));
        if (d.url) content.push(linkPara(document, d.url, name || d.accessibilityLabel));
        return content.length ? [content] : null;
      }).filter(Boolean);
    } else {
      cells = [...root.querySelectorAll("a[href]")].filter((a) => a.querySelector("p") && a.nextElementSibling).map((a) => {
        const name = clean(a.textContent).replace(/chevron_right$/, "").trim();
        const content = [el(document, "h3", name)];
        const desc = clean(a.nextElementSibling.textContent);
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
    if (!clean(cfg.ctaTitle) || !cfg.ctaUrl) return null;
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
        title: clean(header && header.textContent) || clean(pinned && pinned.getAttribute(PIN_LABEL)),
        description: clean(body && body.textContent),
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
        image.src = absUrl(item.image);
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
  function parse(element, { document, params }) {
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
  var ORIGIN2 = "https://www.jll.com";
  var PIN_HREF2 = "data-excat-href";
  var PIN_LABEL2 = "data-excat-label";
  var CONTACT_MARK = "data-excat-contact";
  var CONTACT_ANCHORS = ["input-form", "contactus", "contact-us", "get-started", "contact"];
  var SITE_HOSTS = ["www.jll.com", "jll.com"];
  var SITE_LOCALE = /^\/en-us(\/|$)/i;
  var AEM_SITE_ROOT = /^\/content\/jll-com-phoenix\/country\/amer\/us\/en(\/|$)/i;
  function clean2(text) {
    return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
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
  function decodeHtml2(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function richParagraphs(document, container, keepHeadings = false) {
    const out = [];
    const sel = keepHeadings ? "p, ul, ol, h1, h2, h3, h4, h5, h6" : "p, ul, ol";
    const blocks = [...container.querySelectorAll(sel)].filter((n) => !n.parentElement.closest(sel));
    const sources = blocks.length ? blocks : clean2(container.textContent) ? [container] : [];
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
        if (n.tagName === "A") n.setAttribute("href", absUrl2(n.getAttribute("href")));
      });
      if (clean2(node.textContent)) out.push(node);
    });
    return out;
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
  function slugify(text) {
    return clean2(text).toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
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
        url = new URL(href, `${ORIGIN2}/`);
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
      const cfg = readConfig(node, "sectionheading");
      const lines = (cfg && Array.isArray(cfg.titles) ? cfg.titles : []).map((t) => clean2(decodeHtml2(document, t).textContent)).filter(Boolean);
      const rendered = node.querySelector("h1, h2, h3");
      const title = lines.length ? lines.join(" ") : clean2(rendered && rendered.textContent);
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
      if (clean2(a.textContent) || a.querySelector("img, picture, video")) return;
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
          if (video && video.getAttribute("poster") && (!host.querySelector("video-js") || title && clean2(title.textContent))) break;
          yield wait(250);
        }
      }
      win.scrollTo(0, 0);
    });
  }
  function removeEmptyComponents(root, detail = false) {
    root.querySelectorAll("div.banner.aem-GridColumn").forEach((banner) => {
      const cfg = readConfig(banner, "banner");
      let empty = !cfg || !cfg.bannerType;
      if (detail && !empty && cfg.bannerType === "message") {
        empty = !clean2(cfg.messageTitle) && !clean2(cfg.messageDescription) && !clean2(cfg.messageButtonTitle);
      }
      if (detail && !empty && cfg.bannerType === "fullwidthmessage") {
        empty = !clean2(cfg.fullWidthMessageTitle) && !clean2(cfg.label);
      }
      if (empty || cfg.hideBanner === true || cfg.hideBanner === "true") banner.remove();
    });
    root.querySelectorAll("div.jumppoint.aem-GridColumn").forEach((jp) => {
      const cfg = readConfig(jp, "jumppoint");
      const hasLinks = cfg && Array.isArray(cfg.destinations) && cfg.destinations.length;
      if (!hasLinks && !clean2(jp.textContent)) jp.remove();
    });
    root.querySelectorAll("div.accordion.aem-GridColumn").forEach((acc) => {
      const cfg = readConfig(acc, "accordion");
      const hasItems = cfg && Array.isArray(cfg.accordionItems) && cfg.accordionItems.length;
      if (!hasItems && !clean2(acc.textContent)) acc.remove();
    });
  }
  function normalizeEditorials(document, root, detail = false) {
    root.querySelectorAll("div.editorial.aem-GridColumn").forEach((editorial) => {
      const cfg = readConfig(editorial, "editorial");
      const nodes = [];
      const renderedTitle = editorial.querySelector("h1, h2, h3");
      const title = cfg && cfg.title ? clean2(decodeHtml2(document, cfg.title).textContent) : clean2(renderedTitle && renderedTitle.textContent);
      let h2 = null;
      if (title) {
        h2 = document.createElement("h2");
        h2.textContent = title;
        nodes.push(h2);
      }
      if (cfg && cfg.text) {
        nodes.push(...richParagraphs(document, decodeHtml2(document, cfg.text), detail));
      } else {
        [...editorial.querySelectorAll("p")].forEach((p) => {
          if (!clean2(p.textContent)) return;
          const copy = document.createElement("p");
          copy.textContent = clean2(p.textContent);
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
    if (!clean2(label) || !href) return null;
    const p = document.createElement("p");
    const a = document.createElement("a");
    a.href = absUrl2(href);
    a.textContent = clean2(label);
    p.append(a);
    return p;
  }
  function convertFullWidthMessages(document, root) {
    root.querySelectorAll("div.banner.aem-GridColumn").forEach((banner) => {
      const cfg = readConfig(banner, "banner");
      if (!cfg || cfg.bannerType !== "fullwidthmessage") return;
      const nodes = [];
      const title = clean2(decodeHtml2(document, cfg.fullWidthMessageTitle).textContent);
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
      const cfg = readConfig(nav, "secondarynavigation");
      const items = (cfg && Array.isArray(cfg.ctas) ? cfg.ctas : []).map((c) => ({ label: clean2(c.ctatitle || c.accessibilitylabel), href: c.ctaurl })).filter((c) => c.label && c.href);
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
      const id = cfg && clean2(cfg.anchorId);
      if (!id || anchors[id]) return;
      const host = rc.closest("div.aem-GridColumn") || rc;
      const heading = host.querySelector("h1, h2");
      const titleSrc = heading && heading.textContent || cfg.title || cfg.maintitle || cfg.accordiontile || "";
      const slug = heading && ids.get(heading) || slugify(decodeHtml2(document, titleSrc).textContent);
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
        url = new URL(href, pageUrl || `${ORIGIN2}/`);
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
        url = new URL(href, pageUrl || `${ORIGIN2}/`);
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
        url = new URL(href, `${ORIGIN2}/`);
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

  // tools/importer/transformers/services-hub.js
  var TEMPLATE3 = "services-hub";
  var RESULTS_ATTR = "data-excat-search-results";
  var CARD = ".c-default-card";
  var MAX_PAGES = 20;
  function clean3(text) {
    return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
  function decodeHtml3(document, str) {
    const div = document.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function readConfig2(root, component) {
    const rc = root.querySelector(`react-component[data-component="${component}"][data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config") || "null");
    } catch (e) {
      return null;
    }
  }
  function isTemplate3(payload) {
    return Boolean(payload && payload.template && payload.template.name === TEMPLATE3);
  }
  function readCard(card) {
    const link = card.querySelector("a.c-default-card__overlay-link[href], a[href]");
    const header = card.querySelector('[data-testid="c-default-card__content-header"], .c-default-card__content-header');
    const body = card.querySelector('[data-testid="c-default-card__content-body"], .c-default-card__content-body');
    const img = card.querySelector(".c-default-card__image img");
    return {
      href: link ? link.getAttribute("href") : "",
      title: clean3(header && header.textContent) || clean3(link && link.getAttribute("aria-label")),
      description: clean3(body && body.textContent),
      image: img ? img.getAttribute("src") || "" : "",
      alt: img ? img.getAttribute("alt") || "" : ""
    };
  }
  function imageLoads(win, src) {
    return new Promise((resolve) => {
      const probe = new win.Image();
      const timer = win.setTimeout(() => resolve(false), 1e4);
      probe.onload = () => {
        win.clearTimeout(timer);
        resolve(probe.naturalWidth > 0);
      };
      probe.onerror = () => {
        win.clearTimeout(timer);
        resolve(false);
      };
      probe.src = src;
    });
  }
  function collectSearchResults(root) {
    return __async(this, null, function* () {
      const host = root.querySelector("div.search");
      const win = root.ownerDocument && root.ownerDocument.defaultView;
      if (!host || !win) return;
      const wait = (ms) => new Promise((resolve) => {
        win.setTimeout(resolve, ms);
      });
      const pageKey = () => [...host.querySelectorAll(CARD)].map((c) => readCard(c).href || "").join("|");
      const results = [];
      const seen = /* @__PURE__ */ new Set();
      let previous = "";
      for (let page = 0; page < MAX_PAGES; page += 1) {
        let key = pageKey();
        const start = Date.now();
        while ((!key || key === previous) && Date.now() - start < 1e4) {
          yield wait(250);
          key = pageKey();
        }
        if (!key || key === previous) break;
        previous = key;
        [...host.querySelectorAll(CARD)].map(readCard).forEach((item) => {
          if (!item.href || !item.title || seen.has(item.href)) return;
          seen.add(item.href);
          results.push(item);
        });
        const next = [...host.querySelectorAll('nav[aria-label="pagination"] button')].find((b) => /next/i.test(clean3(b.textContent)));
        if (!next || next.disabled) break;
        next.click();
      }
      const checks = yield Promise.all(results.map((item) => item.image ? imageLoads(win, item.image) : Promise.resolve(false)));
      results.forEach((item, i) => {
        if (!checks[i]) {
          item.image = "";
          item.alt = "";
        }
      });
      if (results.length) host.setAttribute(RESULTS_ATTR, JSON.stringify(results));
    });
  }
  function heroToDefaultContent(document, root) {
    root.querySelectorAll("div.hero.aem-GridColumn").forEach((hero) => {
      const cfg = readConfig2(hero, "hero");
      if (!cfg || cfg.heroStyle !== "single" || cfg.imagePath || cfg.withVideo) return;
      const nodes = [];
      const rendered = hero.querySelector("h1");
      const title = clean3(decodeHtml3(document, cfg.title).textContent) || clean3(rendered && rendered.textContent);
      if (title) {
        const h1 = document.createElement("h1");
        h1.textContent = title;
        nodes.push(h1);
      }
      const desc = decodeHtml3(document, cfg.description);
      const paras = [...desc.querySelectorAll("p")];
      (paras.length ? paras : [desc]).forEach((src) => {
        const text = clean3(src.textContent);
        if (!text) return;
        const p = document.createElement("p");
        p.textContent = text;
        nodes.push(p);
      });
      if (nodes.length) hero.replaceChildren(...nodes);
    });
  }
  function transform4(hookName, element, payload) {
    if (!isTemplate3(payload)) return;
    const document = element.ownerDocument;
    if (hookName === "preprocess") {
      return collectSearchResults(element).catch((e) => console.error("services-hub: search results not collected", e));
    }
    if (hookName === "beforeTransform") {
      heroToDefaultContent(document, element);
    }
  }

  // tools/importer/import-services-hub.js
  var PAGE_TEMPLATE = {
    "name": "services-hub",
    "urls": [
      "https://www.jll.com/en-us/services"
    ],
    "representativeUrl": "https://www.jll.com/en-us/services",
    "description": 'JLL services hub (/en-us/services): "single" hero (H1 + intro on a light band, no media) and the search component listing every service / hub page (paginated image cards; static snapshot of all pages).',
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
  var parsers = {
    "cards-eyebrow": parse
  };
  var sectionTransformers = [transform3];
  var fragmentTransformers = [];
  var lateTransformers = [...sectionTransformers, ...fragmentTransformers];
  var transformers = [transform, transform2, transform4, ...lateTransformers];
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
  var import_services_hub_default = {
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
  return __toCommonJS(import_services_hub_exports);
})();
