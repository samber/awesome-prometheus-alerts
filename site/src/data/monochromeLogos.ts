// Logos that ship as a single dark color (Simple Icons fallbacks, OpenZFS,
// and the hand-drawn icons for tools with no available brand mark) render
// too dark to see on a dark background, so they need inverting to white.
// Shared between ServiceLogo.astro (site chrome, uses the `dark:invert`
// Tailwind class) and SearchOverlay.astro (Pagefind's result thumbnails,
// which render outside our component tree and need an explicit CSS rule).
export const MONOCHROME_LOGO_SLUGS = new Set([
  // Simple Icons fallbacks (no dashboard-icons entry for these tools)
  'windows-server', 'pulsar', 'nats', 'envoy', 'linkerd', 'sidekiq',
  'apache-flink', 'hadoop', 'fluxcd', 'spinnaker', 'speedtest',
  'digitalocean', 'opentelemetry-collector', 'zfs',
  // Hand-drawn icons for tools with no available brand logo
  'host-and-hardware', 's-m-a-r-t-device-monitoring', 'ipmi', 'blackbox',
  'process-exporter', 'patroni', 'pgbouncer', 'ssl-tls',
  'freeswitch', 'snmp',
]);
