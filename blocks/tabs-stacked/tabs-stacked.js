import { getMetadata, toClassName } from '../../scripts/aem.js';

/*
 * Stacked tabs: a grid of full-width triggers that open one panel at a time
 * below them. Like the project's section-based tabs block, panels are the
 * sections that follow the block's section and carry "Tab ID" / "Tab Title"
 * section metadata.
 *
 * The shared createTabs() run from blocks/dynamic/index.js skips any tab
 * section that sits inside an element with the "tabs-wrapper" class, so the
 * layout element carries that class as a marker. That keeps the generic tabs
 * UI from claiming the sections this block owns.
 */
const SHARED_TABS_MARKER = 'tabs-wrapper';

/*
 * Screen-reader labels for the panel's previous/next controls. Override with
 * page metadata: tabs-stacked-label-previous, tabs-stacked-label-next.
 */
const DEFAULT_LABELS = {
  previous: 'Previous slide',
  next: 'Next slide',
};

function getLabels() {
  return Object.fromEntries(Object.entries(DEFAULT_LABELS)
    .map(([key, fallback]) => [key, getMetadata(`tabs-stacked-label-${key}`) || fallback]));
}

let instanceCount = 0;

function getTabDefinition(section, idx) {
  const tabId = String(section.dataset?.tabId || '').trim();
  if (!tabId) return null;
  const title = String(section.dataset?.tabTitle || tabId).trim();
  return {
    id: toClassName(tabId) || `tab-${idx + 1}`,
    title,
    section,
  };
}

/**
 * If the shared createTabs() ran before this block (e.g. when a fragment in an
 * earlier section triggered dynamic blocks), it wrapped the tab sections in a
 * generated "section tabs" container. Move them back so this block can own them.
 */
function reclaimSharedTabs(currSection) {
  const next = currSection.nextElementSibling;
  if (!next?.classList.contains('tabs') || next.dataset.tabId) return;
  const claimed = [...next.querySelectorAll('[role="tabpanel"] > .section[data-tab-id]')];
  if (!claimed.length) return;
  currSection.after(...claimed);
  next.remove();
}

function collectTabSections(currSection) {
  const defs = [];
  let next = currSection.nextElementSibling;
  while (next?.classList.contains('section')) {
    const def = getTabDefinition(next, defs.length);
    if (!def) break;
    defs.push(def);
    next = next.nextElementSibling;
  }
  return defs;
}

function setOpen(defs, openId) {
  defs.forEach(({ id, button, panel }) => {
    const isOpen = id === openId;
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    button.classList.toggle('is-active', isOpen);
    panel.hidden = !isOpen;
  });
}

function createPanelHeader(title, labels, withControls) {
  const header = document.createElement('div');
  header.className = 'tabs-stacked-panel-header';

  const heading = document.createElement('p');
  heading.className = 'tabs-stacked-panel-title';
  heading.textContent = title;
  header.append(heading);

  if (withControls) {
    const controls = document.createElement('div');
    controls.className = 'tabs-stacked-panel-controls';
    [['previous', -1], ['next', 1]].forEach(([key, step]) => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = `tabs-stacked-panel-${key}`;
      control.dataset.step = step;
      control.setAttribute('aria-label', labels[key]);
      controls.append(control);
    });
    header.append(controls);
  }

  return header;
}

/** @param {Element} block */
export default function decorate(block) {
  const currSection = block.closest('.section');
  if (!currSection) return;

  reclaimSharedTabs(currSection);
  const defs = collectTabSections(currSection);
  if (!defs.length) return;

  const labels = getLabels();
  instanceCount += 1;
  const prefix = `tabs-stacked-${instanceCount}`;

  const layout = document.createElement('div');
  layout.className = `tabs-stacked-layout ${SHARED_TABS_MARKER}`;

  const list = document.createElement('div');
  list.className = 'tabs-stacked-list';

  const panels = document.createElement('div');
  panels.className = 'tabs-stacked-panels';

  defs.forEach((def) => {
    const buttonId = `${prefix}-${def.id}-trigger`;
    const panelId = `${prefix}-${def.id}-panel`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-stacked-trigger';
    button.id = buttonId;
    button.setAttribute('aria-controls', panelId);
    button.setAttribute('aria-expanded', 'false');

    const label = document.createElement('span');
    label.className = 'tabs-stacked-trigger-label';
    label.textContent = def.title;
    const arrow = document.createElement('span');
    arrow.className = 'tabs-stacked-trigger-icon';
    arrow.setAttribute('aria-hidden', 'true');
    button.append(label, arrow);

    const panel = document.createElement('div');
    panel.className = 'tabs-stacked-panel';
    panel.id = panelId;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', buttonId);
    panel.hidden = true;
    panel.append(createPanelHeader(def.title, labels, defs.length > 1), def.section);

    def.button = button;
    def.panel = panel;
    list.append(button);
    panels.append(panel);
  });

  const open = (id) => {
    setOpen(defs, id);
    if (id) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${id}`);
    }
  };

  defs.forEach((def) => {
    def.button.addEventListener('click', () => {
      const isOpen = def.button.getAttribute('aria-expanded') === 'true';
      open(isOpen ? null : def.id);
    });
  });

  panels.addEventListener('click', (event) => {
    const control = event.target.closest('[data-step]');
    if (!control) return;
    const current = defs.findIndex(({ panel }) => !panel.hidden);
    if (current < 0) return;
    const target = (current + Number(control.dataset.step) + defs.length) % defs.length;
    open(defs[target].id);
    defs[target].panel.querySelector(`[data-step="${control.dataset.step}"]`)?.focus();
  });

  const hash = window.location.hash.replace('#', '').toLowerCase();
  setOpen(defs, defs.find((def) => def.id === hash)?.id || null);

  layout.append(list, panels);
  block.replaceChildren(layout);
}
