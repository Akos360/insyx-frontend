import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";
import { useTheme } from "../../theme/useTheme";

// Lazy-loaded on HomePage since three.js/@react-three/fiber are only needed here.
// Must stay full-bleed — the sphere's camera framing is tuned to the page's aspect
// ratio, so narrowing the canvas distorts it. Text clearance is handled by .homeHeroScrim instead.
export default function HeroGradient() {
  const { theme } = useTheme();
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <ShaderGradientCanvas
      style={{ position: "absolute", inset: 0, opacity: theme === "light" ? 0.32 : 0.55 }}
    >
      <ShaderGradient
        type="sphere"
        control="props"
        animate={reduceMotion ? "off" : "on"}
        color1="#23395b"
        color2="#406e8e"
        color3="#cbf7ed"
        cAzimuthAngle={180}
        cPolarAngle={85}
        cDistance={3.4}
        cameraZoom={1}
        uSpeed={0.15}
        uStrength={2.2}
        uDensity={1.1}
        brightness={1}
        lightType="env"
        envPreset="city"
        reflection={0.1}
        grain="off"
      />
    </ShaderGradientCanvas>
  );
}
