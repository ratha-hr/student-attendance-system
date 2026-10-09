export type PrintOrientation = 'portrait' | 'landscape';

export function triggerPrint(orientation: PrintOrientation = 'landscape') {
  let styleEl = document.getElementById('print-orientation-style') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'print-orientation-style';
    document.head.appendChild(styleEl);
  }

  const margin = orientation === 'landscape' ? '4mm' : '8mm';

  styleEl.innerHTML = `
    @page {
      size: ${orientation} !important;
      margin: ${margin} !important;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;

  // Brief delay allows the browser's layout engine to register the new @page size before opening print dialog
  setTimeout(() => {
    window.print();
  }, 120);
}
