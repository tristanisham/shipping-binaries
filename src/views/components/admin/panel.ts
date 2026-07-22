// Design tokens for admin section panels.
//
// Admin sections invert the site palette: the panel background takes the
// secondary color and the text takes the primary color, then both flip in
// dark mode. This mirrors the header control bar and matches the site's
// established inverse-panel language.
//
//   light: bg mist-600 / text amber-50
//   dark:  bg amber-50 / text mist-600
//
// `panelSurface` is baked into the Card primitive (admin-only), so these
// tokens cover the elements that sit *on* the panel and need to stay legible
// against the inverted background in both modes.

// Full inverse surface. Applied by the Card primitive; exported for any panel
// that isn't a Card.
export const panelSurface =
  "bg-mist-600 text-amber-50 dark:bg-amber-50 dark:text-mist-600";

// Hairline dividers (card header/footer borders, table rules).
export const panelDivider = "border-amber-50/20 dark:border-mist-600/20";

// Secondary/muted text on the panel.
export const panelMuted = "text-amber-50/70 dark:text-mist-600/70";

// A softly recessed row/well tinted from the panel's text color.
export const panelRow =
  "border border-amber-50/15 bg-amber-50/10 dark:border-mist-600/15 dark:bg-mist-600/10";

// Dashed empty-state container.
export const panelEmpty =
  "border border-dashed border-amber-50/30 dark:border-mist-600/30";

// Form fields on the panel: a faint well that reads in both modes.
export const panelField =
  "border-amber-50/25 bg-amber-50/10 text-amber-50 placeholder:text-amber-50/50 focus-visible:border-amber-50/60 dark:border-mist-600/25 dark:bg-mist-600/10 dark:text-mist-600 dark:placeholder:text-mist-600/50 dark:focus-visible:border-mist-600/60";

// Outline button recolored to the panel's text color.
export const panelOutlineButton =
  "border-amber-50/40 bg-transparent text-amber-50 hover:bg-amber-50/10 hover:text-amber-50 dark:border-mist-600/40 dark:text-mist-600 dark:hover:bg-mist-600/10 dark:hover:text-mist-600";

// Ghost button hover recolored to the panel.
export const panelGhostButton =
  "hover:bg-amber-50/10 dark:hover:bg-mist-600/10";
