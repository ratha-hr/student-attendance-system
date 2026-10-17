import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  QrCode,
  CloudUpload,
  CloudDownload,
  Send,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { db } from '../db/db';

interface CrossDeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CrossDeviceSyncModal: React.FC<CrossDeviceSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'code' | 'telegram' | 'direct'>('qr');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'loading'; text: string } | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate random 6-digit code
  const generateNewCode = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return String(num);
  };

  // Upload current database to Cloud Sync Relay (ntfy.sh)
  const handleUploadToCloud = async (customCode?: string) => {
    const code = customCode || generatedCode || generateNewCode();
    setGeneratedCode(code);
    setIsUploading(true);
    setStatusMsg({ type: 'loading', text: 'កំពុងរៀបចំ និងបង្ហោះទិន្នន័យឡើង Cloud...' });

    try {
      const backupStr = await db.exportBackupJSON();
      const topic = `kh-sync-hunratha-${code}`;

      const res = await fetch(`https://ntfy.sh/${topic}`, {
        method: 'PUT',
        headers: {
          Filename: 'backup.json',
          Title: 'Hun Ratha Attendance Backup',
          Tags: 'sync,cambodia,education',
        },
        body: backupStr,
      });

      if (!res.ok) {
        throw new Error(`Cloud server status: ${res.status}`);
      }

      setIsUploading(false);
      setStatusMsg({
        type: 'success',
        text: `✅ បានបង្ហោះទិន្នន័យជោគជ័យ! លេខកូដ Sync របស់អ្នកគឺ៖ ${code.slice(0, 3)}-${code.slice(3)}`,
      });
      return code;
    } catch (err: any) {
      console.error('Cloud sync upload failed:', err);
      setIsUploading(false);
      setStatusMsg({
        type: 'error',
        text: `មានបញ្ហាក្នុងការបង្ហោះទិន្នន័យ៖ ${err.message || 'សូមពិនិត្យមើលអ៊ីនធឺណិត'}`,
      });
      return null;
    }
  };

  // Download & restore data from Cloud Sync Relay using 6-digit code
  const handleDownloadFromCloud = async () => {
    const cleanCode = inputCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setStatusMsg({ type: 'error', text: 'សូមបញ្ចូលលេខកូដសម្ងាត់ឱ្យគ្រប់ ៦ ខ្ទង់!' });
      return;
    }

    setIsDownloading(true);
    setStatusMsg({ type: 'loading', text: `កំពុងទាញយកទិន្នន័យពី Cloud (កូដ: ${cleanCode})...` });

    try {
      const topic = `kh-sync-hunratha-${cleanCode}`;
      const res = await fetch(`https://ntfy.sh/${topic}/raw`);
      if (!res.ok) {
        throw new Error(`រកមិនឃើញទិន្នន័យសម្រាប់កូដ ${cleanCode} នេះទេ ឬទិន្នន័យបានផុតកំណត់!`);
      }

      const rawData = await res.text();
      if (!rawData || !rawData.trim().startsWith('{')) {
        throw new Error('ទិន្នន័យដែលទទួលបានមិនត្រឹមត្រូវ!');
      }

      await db.importBackupJSON(rawData);
      setIsDownloading(false);
      setStatusMsg({
        type: 'success',
        text: '✅ សមកាលកម្មជោគជ័យ! ទិន្នន័យទាំងអស់ត្រូវបានផ្ទុកចូលឧបករណ៍នេះ ១០០%។',
      });

      if (onSuccess) onSuccess();
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      console.error('Cloud download failed:', err);
      setIsDownloading(false);
      setStatusMsg({
        type: 'error',
        text: `ទាញយកទិន្នន័យមិនបានសម្រេច៖ ${err.message || 'សូមពិនិត្យមើលលេខកូដ និងអ៊ីនធឺណិត'}`,
      });
    }
  };

  // One-click Reset / Align to Teacher's Real 4 Classes
  const handleQuickAlign = async () => {
    if (!window.confirm('តើអ្នកពិតជាចង់កែសម្រួលទិន្នន័យលើឧបករណ៍នេះ ឱ្យស្របតាមថ្នាក់ទាំង ៤ របស់លោកគ្រូ (7A, 7B, 9A, 10A) មែនទេ?')) {
      return;
    }
    setStatusMsg({ type: 'loading', text: 'កំពុងកែតម្រូវទិន្នន័យឱ្យដូចកុំព្យូទ័រ...' });
    try {
      await db.resetToTeacherFourClasses();
      setStatusMsg({
        type: 'success',
        text: '✅ រួចរាល់! ថ្នាក់ទាំង ៤ (7A, 7B, 9A, 10A) ត្រូវបានរៀបចំដូចកុំព្យូទ័រ ១០០%។',
      });
      if (onSuccess) onSuccess();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `មានបញ្ហា៖ ${err.message}` });
    }
  };

  // Download Backup JSON file & open Telegram
  const handleTelegramSync = async () => {
    try {
      const jsonStr = await db.exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_hun_ratha_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMsg({
        type: 'success',
        text: '✅ បានទាញយកឯកសារ Backup! សូមផ្ញើឯកសារនេះចូល Telegram Saved Messages រួចបើកលើទូរស័ព្ទ។',
      });

      // Open Telegram web/desktop
      setTimeout(() => {
        window.open('https://t.me/share/url?url=' + encodeURIComponent('ឯកសារ Backup ទិន្នន័យសិស្ស និងវត្តមាន'), '_blank');
      }, 800);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `មានបញ្ហា៖ ${err.message}` });
    }
  };

  // Import from JSON file
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        await db.importBackupJSON(text);
        setStatusMsg({
          type: 'success',
          text: '✅ ស្តារទិន្នន័យពីឯកសារ Backup ជោគជ័យ! ប្រព័ន្ធកំពុង Reload...',
        });
        if (onSuccess) onSuccess();
        setTimeout(() => window.location.reload(), 1200);
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: `ឯកសារ Backup មិនត្រឹមត្រូវ៖ ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  // QR Sync Target URL
  const qrTargetUrl = generatedCode
    ? `${window.location.origin}${window.location.pathname}?sync_code=${generatedCode}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs flex items-center gap-1.5 text-white">
              <Laptop className="w-5 h-5" />
              <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>សមកាលកម្មទិន្នន័យ (កុំព្យូទ័រ ⇄ ទូរស័ព្ទដៃ)</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Sync 100%
                </span>
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                ផ្ទេរទិន្នន័យថ្នាក់ សិស្ស វត្តមាន និងផែនការបង្រៀនឱ្យដូចគ្នាគ្រប់កាលៈទេសៈ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusMsg.type === 'loading'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
              {statusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{statusMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 overflow-x-auto text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'qr'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>ស្កេន QR កូដ (ងាយបំផុត)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'code'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>កូដ Cloud ៦ ខ្ទង់</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'telegram'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-sky-500" />
            <span>ផ្ទេរតាម Telegram</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'direct'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>កែសម្រួលឱ្យដូចកុំព្យូទ័រ</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: QR CODE SYNC */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-xs text-blue-950">
                <p className="font-bold mb-1 flex items-center gap-1.5 text-blue-900 text-sm">
                  <span>📸 របៀបផ្ទេរទិន្នន័យពីកុំព្យូទ័រចូលទូរស័ព្ទដៃ ដោយស្កេន QR ៖</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1 leading-relaxed">
                  <li>ចុចប៊ូតុង <strong>«បង្កើត QR Code ផ្ទេរទៅទូរស័ព្ទ»</strong> ខាងក្រោមនេះ។</li>
                  <li>យកទូរស័ព្ទដៃ (iPhone ឬ Android) បើក <strong>Camera (កាមេរ៉ា)</strong> ឬ <strong>Telegram</strong>។</li>
                  <li>ស្កេនលើរូប QR Code ដែលបង្ហាញលើអេក្រង់កុំព្យូទ័រ រួចចុចបើកតំណភ្ជាប់។</li>
                  <li>ប្រព័ន្ធនឹងទាញយកទិន្នន័យទាំងអស់ពីកុំព្យូទ័រចូលទូរស័ព្ទដោយស្វ័យប្រវត្តិ ១០០%!</li>
                </ol>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                {!generatedCode ? (
                  <button
                    type="button"
                    onClick={() => handleUploadToCloud()}
                    disabled={isUploading}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <QrCode className="w-5 h-5 text-amber-300" />
                    )}
                    <span>បង្កើត QR Code ផ្ទេរទៅទូរស័ព្ទ</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-blue-400">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                          qrTargetUrl
                        )}`}
                        alt="Sync QR Code"
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-bold">លេខកូដសមកាលកម្ម (Sync PIN) ៖</div>
                      <div className="text-2xl font-black text-blue-700 tracking-widest font-mono bg-blue-50 px-4 py-1 rounded-xl border border-blue-200 inline-block mt-1">
                        {generatedCode.slice(0, 3)}-{generatedCode.slice(3)}
                      </div>
                    </div>
                    <p className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      ✨ យកទូរស័ព្ទបើកកាមេរ៉ាស្កេន QR Code ខាងលើនេះ ដើម្បី Sync ភ្លាមៗ!
                    </p>
                    <button
                      type="button"
                      onClick={() => handleUploadToCloud()}
                      disabled={isUploading}
                      className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                      <span>បង្កើត QR Code ថ្មីម្តងទៀត</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 6-DIGIT CLOUD CODE */}
          {activeTab === 'code' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Send / Upload from this device */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-blue-900 font-black text-sm mb-1">
                    <CloudUpload className="w-5 h-5 text-blue-600" />
                    <span>១. ផ្ញើទិន្នន័យពីឧបករណ៍នេះ</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតលេខកូដសម្ងាត់ ៦ ខ្ទង់ ហើយយកលេខកូដនោះទៅវាយលើទូរស័ព្ទដៃ។
                  </p>
                </div>

                {generatedCode ? (
                  <div className="bg-white p-3 rounded-xl border border-blue-200 text-center space-y-2">
                    <span className="text-[11px] text-slate-500 font-bold block">លេខកូដ Sync របស់អ្នក ៖</span>
                    <span className="text-2xl font-black text-blue-700 tracking-wider font-mono">
                      {generatedCode.slice(0, 3)}-{generatedCode.slice(3)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="w-full py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'បានចម្លង!' : 'ចម្លងកូដ'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUploadToCloud()}
                    disabled={isUploading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                    <span>បង្កើតកូដ ៦ ខ្ទង់</span>
                  </button>
                )}
              </div>

              {/* Box 2: Receive / Download to this device */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-sm mb-1">
                    <CloudDownload className="w-5 h-5 text-emerald-600" />
                    <span>២. ទទួលទិន្នន័យលើឧបករណ៍នេះ</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    វាយបញ្ចូលលេខកូដសម្ងាត់ ៦ ខ្ទង់ដែលបានបង្កើតពីកុំព្យូទ័រ ដើម្បីទាញយកទិន្នន័យចូល។
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={7}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="ឧ. 123456 ឬ 123-456"
                    className="w-full px-3 py-2 text-center text-lg font-black tracking-widest text-emerald-800 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleDownloadFromCloud}
                    disabled={isDownloading || !inputCode.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudDownload className="w-4 h-4" />
                    )}
                    <span>ទាញយក & ស្តារទិន្នន័យ</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TELEGRAM & BACKUP FILE */}
          {activeTab === 'telegram' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-950">
                <p className="font-bold mb-1 flex items-center gap-1.5 text-sky-900 text-sm">
                  <span>✈️ របៀបផ្ទេរទិន្នន័យតាម Telegram ៖</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1 leading-relaxed">
                  <li>នៅលើកុំព្យូទ័រ ចុច «ផ្ញើ Backup ទៅ Telegram» (ឯកសារ .json នឹងទាញយករួចបើក Telegram)។</li>
                  <li>ផ្ញើឯកសារនោះចូលទៅកាន់ <strong>Saved Messages (សារដែលបានរក្សាទុក)</strong> របស់អ្នក។</li>
                  <li>នៅលើទូរស័ព្ទដៃ បើកកម្មវិធីនេះ រួចចុច <strong>«ស្តារទិន្នន័យពីឯកសារ Backup»</strong> ហើយជ្រើសរើសឯកសារនោះជាការស្រេច!</li>
                </ol>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTelegramSync}
                  className="p-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2"
                >
                  <Send className="w-6 h-6 text-sky-200" />
                  <span className="font-black text-xs sm:text-sm">ផ្ញើ Backup ទៅ Telegram</span>
                  <span className="text-[11px] text-sky-100 font-medium">ទាញយក .json រួចបើក Telegram</span>
                </button>

                <label className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2">
                  <Upload className="w-6 h-6 text-emerald-200" />
                  <span className="font-black text-xs sm:text-sm">ស្តារទិន្នន័យពីឯកសារ Backup (.json)</span>
                  <span className="text-[11px] text-emerald-100 font-medium">ចុចដើម្បីជ្រើសរើសឯកសារ</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT QUICK ALIGNMENT (ថ្នាក់ទាំង ៤ របស់លោកគ្រូ) */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950">
                <p className="font-black mb-1.5 flex items-center gap-1.5 text-amber-900 text-sm">
                  <span>⚡ កែតម្រូវទិន្នន័យលើឧបករណ៍នេះ ឱ្យដូចកុំព្យូទ័រភ្លាមៗ ៖</span>
                </p>
                <p className="text-slate-700 leading-relaxed mb-2">
                  ប្រសិនបើទូរស័ព្ទដៃរបស់អ្នកកំពុងបង្ហាញថ្នាក់ចាស់ៗ ឬគ្រូគំរូ (សុខ សារឿន, ជា ស្រីពៅ, ចាន់ សុផល) ចុចប៊ូតុងខាងក្រោមនេះ ដើម្បីកែប្រែមកជាថ្នាក់ទាំង ៤ ជាក់ស្ដែងរបស់លោកគ្រូ <strong>ហ៊ុន រដ្ឋា</strong> ភ្លាមៗ ៖
                </p>
                <ul className="grid grid-cols-2 gap-1.5 font-bold text-slate-800 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                  <li>• ថ្នាក់ទី 7A • គ្រូ: ហ៊ុន រដ្ឋា</li>
                  <li>• ថ្នាក់ទី 7B • គ្រូ: ហ៊ុន រដ្ឋា</li>
                  <li>• ថ្នាក់ទី 9A • គ្រូ: សាលា</li>
                  <li>• ថ្នាក់ទី 10A • គ្រូ: ចាបុត</li>
                </ul>
                <p className="text-[11px] text-slate-500 mt-2">
                  * ព្រមទាំងកំណត់ឈ្មោះសាលា វិទ្យាល័យ ហ៊ុន សែន កំពង់ត្រឡាច នាយករងបច្ចេកទេស ណាក សំណាង (012 925 739) ដោយស្វ័យប្រវត្តិ។
                </p>
              </div>

              <button
                type="button"
                onClick={handleQuickAlign}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95"
              >
                <Sparkles className="w-5 h-5 text-white" />
                <span>ចុចទីនេះ ដើម្បីកំណត់ថ្នាក់ទាំង ៤ ឱ្យដូចកុំព្យូទ័រភ្លាមៗ</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500 font-medium">
            💡 គាំទ្រទាំង iOS Safari, Android Chrome និង Windows PC
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            បិទ
          </button>
        </div>
      </div>
    </div>
  );
};
