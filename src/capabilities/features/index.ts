import type TypewriterModeLib from "@/lib";
import type { Feature } from "../base/feature";
import currentLine from "./current-line";
import general from "./general";
import restoreCursorPosition from "./restore-cursor-position";

export function getFeatures(
  tm: TypewriterModeLib
): Record<string, Record<string, Feature>> {
  return {
    currentLine: currentLine(tm),
    general: general(tm),
    restoreCursorPosition: restoreCursorPosition(tm),
  };
}
