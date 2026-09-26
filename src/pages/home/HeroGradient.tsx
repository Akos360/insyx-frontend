import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";
import { useTheme } from "../../theme/useTheme";

// Ambient animated backdrop for the landing hero — a slow-drifting 3D sphere,
// a deliberate nod to the app's own institution globe. Colors are the app's
// existing brand anchors (App.css --twilight-indigo/--rich-cerulean/
// --frozen-water) so it reads as part of the same identity, not a generic
// demo gradient. Lazy-loaded (see HomePage) since three.js/@react-three/fiber
// are only needed on this one page.
//
// Full-bleed canvas (the sphere's camera framing is tuned against the whole
// page's aspect ratio — narrowing the canvas element itself distorts that).
// Staying clear of the hero text is handled by .homeHeroScrim instead, which
// stays fully opaque out past where the text column ends.
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
