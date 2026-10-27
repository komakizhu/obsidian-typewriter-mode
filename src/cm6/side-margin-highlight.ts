const leftMarginProperty = "--ptm-side-margin-left-width";
const rightMarginProperty = "--ptm-side-margin-right-width";

export function setSideMarginHighlightPosition(
  highlight: HTMLElement,
  container: HTMLElement,
  contentArea: HTMLElement | null
): { left: number; right: number } {
  const containerRect = container.getBoundingClientRect();
  const containerLeft = containerRect.left + container.clientLeft;
  const containerWidth = container.clientWidth;
  const contentRect = contentArea?.getBoundingClientRect();

  const leftWidth = contentRect
    ? Math.max(0, Math.min(containerWidth, contentRect.left - containerLeft))
    : 0;
  const rightWidth = contentRect
    ? Math.max(
        0,
        Math.min(
          containerWidth - leftWidth,
          containerLeft + containerWidth - contentRect.right
        )
      )
    : 0;

  highlight.style.setProperty(leftMarginProperty, `${leftWidth}px`);
  highlight.style.setProperty(rightMarginProperty, `${rightWidth}px`);
  return { left: leftWidth, right: rightWidth };
}

export function clearSideMarginHighlightPosition(highlight: HTMLElement) {
  highlight.style.removeProperty(leftMarginProperty);
  highlight.style.removeProperty(rightMarginProperty);
}
