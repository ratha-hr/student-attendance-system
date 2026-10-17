export type PrintOrientation = 'portrait' | 'landscape';

export function triggerPrint(orientation: PrintOrientation = 'portrait') {
  // Immediately reset scroll positions on all scrollable elements so Chromium never offsets sticky columns
  try {
    const scrollContainers = document.querySelectorAll<HTMLElement>(
      '.table-scrollbar, .overflow-auto, .overflow-x-auto, div[class*="overflow-"]'
    );
    scrollContainers.forEach((el) => {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    });
  } catch (err) {
    console.warn('Error resetting scroll positions for print:', err);
  }

  let styleEl = document.getElementById('print-orientation-style') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'print-orientation-style';
    document.head.appendChild(styleEl);
  }

  const margin = orientation === 'landscape' ? '4mm' : '6mm 5mm 6mm 5mm';

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
      table, thead, tbody, tfoot, tr, th, td {
        position: static !important;
        transform: none !important;
        left: auto !important;
        right: auto !important;
        top: auto !important;
        bottom: auto !important;
      }
      thead {
        display: table-header-group !important;
        break-inside: avoid !important;
      }
      tr {
        break-inside: avoid !important;
      }
    }
  `;

  // Brief delay allows the browser's layout engine to register the new @page size and scroll reset
  setTimeout(() => {
    window.print();
  }, 100);
}
