/**
 * Turns an organisation's brand colour (#rrggbb) into the CSS variables the whole app is painted with, so each
 * organisation gets its own accent while neutrals, spacing and type stay identical.
 * Everything is derived: buttons always keep white text readable (contrast >= 4.5), dark mode gets a lighter tint.
 */
type RGB = [number, number, number];

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const parse = (hex: string): RGB => {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "4f46e5";
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [clamp(a[0] + (b[0] - a[0]) * t), clamp(a[1] + (b[1] - a[1]) * t), clamp(a[2] + (b[2] - a[2]) * t)];
const lum = ([r, g, b]: RGB) => {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrastWithWhite = (c: RGB) => 1.05 / (lum(c) + 0.05);
const triplet = (c: RGB) => c.join(" ");

export function orgThemeCss(hex: string): string {
  const base = parse(hex);
  let a = base;
  for (let i = 0; i < 12 && contrastWithWhite(a) < 4.6; i++) a = mix(a, [11, 16, 32], 0.12); // keep white text readable
  const b = mix(a, [11, 16, 32], 0.5); // deep end of every gradient
  const light = mix(base, [255, 255, 255], 0.42); // brand used as text/ring on dark surfaces
  return `:root{--org:${triplet(a)};--org-a:${triplet(a)};--org-b:${triplet(b)};--org-dk:${triplet(light)}}`;
}
