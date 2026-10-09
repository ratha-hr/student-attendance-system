export type PrintOrientation = 'portrait' | 'landscape';

export function triggerPrint(orientation: PrintOrientation = 'portrait') {
  let styleEl = document.getElementById('print-orientation-style') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'print-orientation-style';
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `@media print { @page { size: ${orientation} !important; margin: 8mm !important; } }`;
  window.print();
}
