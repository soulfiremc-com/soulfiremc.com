// The GitHub themes put comments and some keywords below 4.5:1 on our
// code block backgrounds. These darker (light) and lighter (dark) shades
// keep each token's hue and reach at least 5:1.
export const codeThemes = {
  light: "github-light",
  dark: "github-dark",
} as const;

export const codeColorReplacements = {
  "github-light": {
    "#6a737d": "#57606a",
    "#22863a": "#116329",
    "#d73a49": "#b31d28",
    "#e36209": "#a33b00",
  },
  "github-dark": {
    "#6a737d": "#8b949e",
  },
};
