export function initSponsorClickTracking(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-sponsor-name]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const me = e as MouseEvent;
      const href = a.href;
      const sponsorName = a.dataset.sponsorName!;
      const sponsorSlot = a.dataset.sponsorSlot!;
      const eventData = { sponsor_name: sponsorName, sponsor_url: href, sponsor_slot: sponsorSlot };

      // Modifier / non-primary clicks: track fire-and-forget, let browser handle navigation
      if (me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey) {
        window.posthog?.capture('sponsor_clicked', eventData);
        return;
      }

      // Plain left-click: block navigation until event is recorded
      e.preventDefault();
      window.posthog?.capture('sponsor_clicked', eventData);
      // Open blank tab now (inside user gesture) to avoid popup-blocker after await
      const w = a.target === '_blank' ? window.open('', '_blank') : null;
      if (w) {
        w.location.href = href;
      } else {
        const opened = window.open(href, '_blank');
        if (!opened) {
          window.location.href = href;
        }
      }
    });
  });
}
