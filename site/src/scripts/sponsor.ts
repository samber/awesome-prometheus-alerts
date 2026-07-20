export function initSponsorClickTracking(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-sponsor-name]').forEach((a) => {
    // Header and Footer both call this on the whole document; without this guard
    // each link would end up with several listeners and fire duplicate events.
    if (a.dataset.sponsorTracked) return;
    a.dataset.sponsorTracked = '1';

    a.addEventListener('click', () => {
      window.posthog?.capture('sponsor_clicked', {
        sponsor_name: a.dataset.sponsorName!,
        sponsor_url: a.href,
        sponsor_slot: a.dataset.sponsorSlot!,
      });
    });
  });
}
