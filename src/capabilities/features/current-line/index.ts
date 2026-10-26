import type TypewriterModeLib from "@/lib";
import HighlightCurrentLine from "./highlight-current-line";
import HighlightLastBlockInReadingMode from "./highlight-last-block-in-reading-mode";

export default function getCurrentLineFeatures(tm: TypewriterModeLib) {
  return Object.fromEntries(
    [new HighlightCurrentLine(tm), new HighlightLastBlockInReadingMode(tm)].map(
      (feature) => [feature.getSettingKey(), feature]
    )
  );
}
