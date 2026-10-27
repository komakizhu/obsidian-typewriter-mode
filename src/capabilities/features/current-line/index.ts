import type TypewriterModeLib from "@/lib";
import HighlightCurrentLine from "./highlight-current-line";
import HighlightLastBlockInReadingMode from "./highlight-last-block-in-reading-mode";
import HighlightMaterial from "./highlight-material";
import HighlightShape from "./highlight-shape";
import HighlightSideMarginsOnly from "./highlight-side-margins-only";
import ReadingHighlightMode from "./reading-highlight-mode";

export default function getCurrentLineFeatures(tm: TypewriterModeLib) {
  return Object.fromEntries(
    [
      new HighlightCurrentLine(tm),
      new HighlightSideMarginsOnly(tm),
      new HighlightShape(tm),
      new HighlightMaterial(tm),
      new HighlightLastBlockInReadingMode(tm),
      new ReadingHighlightMode(tm),
    ].map((feature) => [feature.getSettingKey(), feature])
  );
}
