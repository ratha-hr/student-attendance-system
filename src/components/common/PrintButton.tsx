import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { triggerPrint, type PrintOrientation } from '../../utils/printUtils';

interface PrintButtonProps {
  defaultOrientation?: PrintOrientation;
  label?: string;
  className?: string;
  onBeforePrint?: () => void;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  defaultOrientation = 'landscape',
  label = 'បោះពុម្ព',
  className = '',
  onBeforePrint,
}) => {
  const [orientation, setOrientation] = useState<PrintOrientation>(defaultOrientation);

  const handlePrint = () => {
    if (onBeforePrint) onBeforePrint();
    triggerPrint(orientation);
  };

  return (
    <div className={`inline-flex items-center space-x-1.5 no-print ${className}`}>
      {/* Paper Orientation Selector: Portrait (បញ្ឈរ) / Landscape (ផ្ដេក) */}
      <div
        className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs"
        title="ជ្រើសរើសទម្រង់ក្រដាសបោះពុម្ព"
      >
        <button
          type="button"
          onClick={() => setOrientation('portrait')}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
            orientation === 'portrait'
              ? 'bg-white text-blue-700 shadow-2xs font-black'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          title="ក្រដាសបញ្ឈរ (Portrait)"
        >
          <span>📄</span>
          <span className="hidden sm:inline">បញ្ឈរ</span>
        </button>
        <button
          type="button"
          onClick={() => setOrientation('landscape')}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
            orientation === 'landscape'
              ? 'bg-white text-blue-700 shadow-2xs font-black'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          title="ក្រដាសផ្ដេក (Landscape)"
        >
          <span>📃</span>
          <span className="hidden sm:inline">ផ្ដេក</span>
        </button>
      </div>

      {/* Print Trigger Button */}
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        title={`បោះពុម្ពឯកសារជាក្រដាស ${orientation === 'portrait' ? 'បញ្ឈរ (Portrait)' : 'ផ្ដេក (Landscape)'}`}
      >
        <Printer className="w-3.5 h-3.5 mr-1" />
        <span>{label}</span>
      </button>
    </div>
  );
};
