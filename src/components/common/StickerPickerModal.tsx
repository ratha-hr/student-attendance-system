import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Image, Upload, RotateCcw, Check, Sparkles, School, User } from 'lucide-react';

interface StickerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  type: 'school' | 'teacher';
  currentValue?: string;
  onSelect: (value: string) => void;
}

const SCHOOL_STICKERS = [
  '🏫', '🏛️', '🎓', '📚', '📖', '🔔', '🏢', '🌟',
  '🇰🇭', '🦁', '🏆', '🏅', '🎒', '📝', '🚌', '🌳',
  '✨', '🥇', '👑', '🕊️', '🚩', '🤝', '📐', '🔬'
];

const TEACHER_STICKERS = [
  '👨‍🏫', '👩‍🏫', '🧑‍🏫', '👨‍💼', '👩‍💼', '✍️', '📐', '🔬',
  '💻', '🎨', '💡', '🤝', '🌸', '🌺', '🌞', '🧠',
  '⭐', '🌟', '✨', '🔥', '🎯', '💎', '🥇', '👑'
];

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  type,
  currentValue,
  onSelect,
}) => {
  const [selected, setSelected] = useState<string>(currentValue || (type === 'school' ? '🏫' : '👨‍🏫'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stickers = type === 'school' ? SCHOOL_STICKERS : TEACHER_STICKERS;

  // Handle custom photo upload and resize via canvas to keep IndexedDB footprint tiny
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 160;
        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelected(dataUrl);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    onSelect(selected);
    onClose();
  };

  const handleReset = () => {
    const def = type === 'school' ? '🏫' : '👨‍🏫';
    setSelected(def);
  };

  const isImage = selected.startsWith('data:image') || selected.startsWith('http');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle || 'ជ្រើសរើសរូប Sticker ឬបញ្ចូលរូបថតផ្ទាល់ខ្លួនពីឧបករណ៍'}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Preview Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            រូបភាពដែលបានជ្រើសរើស (Preview)
          </span>
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md border-2 border-white overflow-hidden transition-transform"
          >
            {isImage ? (
              <img src={selected} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{selected}</span>
            )}
          </div>
        </div>

        {/* Upload Custom Photo Button */}
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>បញ្ចូលរូបថតផ្ទាល់ខ្លួនពីទូរស័ព្ទ / កុំព្យូទ័រ</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Sticker Gallery Grid */}
        <div>
          <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>ផ្ទាំងរូប Sticker សាលារៀន & គ្រូបង្រៀន</span>
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200/80">
            {stickers.map((stk, idx) => {
              const isSelected = selected === stk;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelected(stk)}
                  className={`h-11 rounded-xl flex items-center justify-center text-2xl transition-all cursor-pointer hover:scale-115 active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500 ring-offset-1'
                      : 'bg-white hover:bg-slate-100 border border-slate-200/70 shadow-2xs'
                  }`}
                >
                  {stk}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="កំណត់រូបដើមឡើងវិញ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>រូបដើម</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>រក្សាទុក</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
