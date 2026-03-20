/**
 * Crossplane sidebar icon — outline popsicle: curved top, flat body, stick. `stroke="currentColor"`.
 *
 * Sync with `img/ice-cream-stick-light.svg`.
 */
const POPSICLE_STROKE_BODY = `<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 7 10 L 7 18 L 17 18 L 17 10 A 5 5 0 0 0 7 10 Z"/>
  <rect x="10" y="18" width="4" height="5" rx="1" ry="1"/>
</g>`;

export const crossplaneSidebarIcon = {
  body: POPSICLE_STROKE_BODY,
  width: 24,
  height: 24,
};

export const crossplaneSidebarEntryBase = {
  name: 'crossplane',
  url: '/crossplane/providers',
  icon: crossplaneSidebarIcon,
  parent: '',
  label: 'Crossplane',
  useClusterURL: true,
};
