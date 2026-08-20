import { GITHUB_URL } from '../data/site';

/** Single delegated listener for every `.copy-btn` on the page — avoids emitting one
 *  <script> block per button (previously ~50+ duplicated inline scripts on the largest
 *  rule pages). */
document.addEventListener('click', async (e) => {
  const btn = (e.target as Element)?.closest?.('.copy-btn');
  if (!(btn instanceof HTMLButtonElement)) return;

  const targetId = btn.dataset.copyTarget;
  if (!targetId) return;
  const target = document.getElementById(targetId);
  if (!target) return;

  let text = target.textContent ?? '';
  text = btn.dataset.withAttribution === '1'
    ? `# Source: ${GITHUB_URL}\n${text.trim()}`
    : text.trim();

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  // Visual feedback
  const copyIcon = btn.querySelector('.copy-icon');
  const checkIcon = btn.querySelector('.check-icon');
  const copyLabel = btn.querySelector('.copy-label');
  const copiedLabel = btn.querySelector('.copied-label');

  copyIcon?.classList.add('hidden');
  checkIcon?.classList.remove('hidden');
  copyLabel?.classList.add('hidden');
  copiedLabel?.classList.remove('hidden');

  setTimeout(() => {
    copyIcon?.classList.remove('hidden');
    checkIcon?.classList.add('hidden');
    copyLabel?.classList.remove('hidden');
    copiedLabel?.classList.add('hidden');
  }, 2000);

  // Inline star nudge
  const nudgeId = btn.dataset.nudgeId;
  if (nudgeId) {
    const nudgeEl = document.getElementById(nudgeId);
    if (nudgeEl) {
      nudgeEl.classList.remove('hidden');
      nudgeEl.classList.add('inline-flex');
      setTimeout(() => {
        nudgeEl.classList.add('hidden');
        nudgeEl.classList.remove('inline-flex');
      }, 3000);
    }
  }

  const payloadRaw = btn.dataset.copyPayload;
  if (payloadRaw) {
    window.dispatchEvent(new CustomEvent('apa-copy', { detail: JSON.parse(payloadRaw) }));
  }
  window.dispatchEvent(new CustomEvent('copy-success'));
});
