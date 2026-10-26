import type TypewriterModeLib from "@/lib";
import TogglePluginActivation from "./toggle-plugin-activation";

export default function getGeneralFeatures(tm: TypewriterModeLib) {
  return Object.fromEntries(
    [new TogglePluginActivation(tm)].map((feature) => [
      feature.getSettingKey(),
      feature,
    ])
  );
}
