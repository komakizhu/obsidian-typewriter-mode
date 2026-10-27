import type { CurrentLineSettings } from "@/capabilities/settings";
import {
  clearSideMarginHighlightPosition,
  setSideMarginHighlightPosition,
} from "./side-margin-highlight";

const appearanceClass = "ptm-highlight-appearance";
const panelClass = "ptm-highlight-decoration-panel";

function ensurePanels(highlight: HTMLElement) {
  let panels = Array.from(
    highlight.querySelectorAll<HTMLElement>(`:scope > .${panelClass}`)
  );
  if (panels.length !== 2) {
    for (const panel of panels) {
      panel.remove();
    }
    panels = ["left", "right"].map((side) => {
      const panel = highlight.ownerDocument.createElement("div");
      panel.className = `${panelClass} ${panelClass}-${side}`;
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("inert", "");
      highlight.appendChild(panel);
      return panel;
    });
  }
  return panels as [HTMLElement, HTMLElement];
}

export function updateHighlightAppearance(
  highlight: HTMLElement,
  container: HTMLElement,
  contentArea: HTMLElement | null,
  settings: CurrentLineSettings,
  lineHeight: number
) {
  highlight.classList.add(appearanceClass);
  highlight.setAttribute("aria-hidden", "true");
  highlight.setAttribute(
    "data-ptm-highlight-range",
    settings.isHighlightSideMarginsOnlyEnabled ? "sides" : "full"
  );
  highlight.setAttribute("data-ptm-highlight-shape", settings.highlightShape);
  highlight.setAttribute(
    "data-ptm-highlight-material",
    settings.highlightMaterial
  );

  const [leftPanel, rightPanel] = ensurePanels(highlight);
  let leftWidth = container.clientWidth;
  let rightWidth = 0;
  if (settings.isHighlightSideMarginsOnlyEnabled) {
    const widths = setSideMarginHighlightPosition(
      highlight,
      container,
      contentArea
    );
    leftWidth = widths.left;
    rightWidth = widths.right;
  } else {
    clearSideMarginHighlightPosition(highlight);
  }

  leftPanel.hidden = leftWidth <= 0 || lineHeight <= 0;
  rightPanel.hidden =
    !settings.isHighlightSideMarginsOnlyEnabled ||
    rightWidth <= 0 ||
    lineHeight <= 0;

  for (const [panel, width] of [
    [leftPanel, leftWidth],
    [rightPanel, rightWidth],
  ] as const) {
    const radius =
      settings.highlightShape === "rounded"
        ? Math.max(
            0,
            Math.min(lineHeight < 32 ? 9 : 13, lineHeight / 2, width / 2)
          )
        : 0;
    panel.style.setProperty("--ptm-highlight-panel-width", `${width}px`);
    panel.style.setProperty("--ptm-highlight-panel-radius", `${radius}px`);
  }
}

export function clearHighlightAppearance(highlight: HTMLElement) {
  highlight.classList.remove(appearanceClass);
  highlight.removeAttribute("data-ptm-highlight-range");
  highlight.removeAttribute("data-ptm-highlight-shape");
  highlight.removeAttribute("data-ptm-highlight-material");
  clearSideMarginHighlightPosition(highlight);
  for (const panel of highlight.querySelectorAll(`:scope > .${panelClass}`)) {
    panel.remove();
  }
}
