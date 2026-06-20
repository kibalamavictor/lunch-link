import type { Config } from "tailwindcss";

import { lunchLinkPreset } from "@lunchlink/ui/tailwind-preset";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  presets: [lunchLinkPreset as Config],
  plugins: [],
};

export default config;
