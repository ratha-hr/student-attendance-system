import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  performAutoSync,
  autoPushToCloud,
  autoPullFromCloud,
  getSyncTopic,
  type AutoSyncResult,
} from '../services/autoSyncService';
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusResult, setStatusResult] = useState<AutoSyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('last_cloud_sync_timestamp') || localStorage.getItem('last_local_data_update');
      if (stored) {
        try {
          const d = new Date(stored);
          setLastSyncTime(d.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch {
          setLastSyncTime('');
        }
      }

      // Auto-execute sync on open immediately without requiring user to click any button
      setIsSyncing(true);
      performAutoSync()
        .then((res) => {
          setStatusResult(res);
          setLastSyncTime(new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          if (res.success && onSuccess) {
            onSuccess();
          }
        })
        .catch((err: any) => {
          setStatusResult({
            action: 'error',
            success: false,
            message: `ស្ថានភាព៖ ${err.message || 'កំពុងរង់ចាំអ៊ីនធឺណិត...'}`,
            timestamp: new Date().toISOString(),
          });
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const topic = getSyncTopic();

  // Force Push: Upload local data to Cloud Master
  const handleForcePush = async () => {
    setIsSyncing(true);
    setStatusResult(null);
    try {
      const res = await performAutoSync(true);
      setStatusResult(res);
      setLastSyncTime(new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (res.success && onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setStatusResult({
        action: 'error',
        success: false,
        message: `មានបញ្ហាក្នុងការបង្ហោះ៖ ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Force Pull: Fetch and overwrite local data with Cloud Master
  const handleForcePull = async () => {
    setIsSyncing(true);
    setStatusResult(null);
    try {
      const cloudData = await autoPullFromCloud();
      if (!cloudData || !cloudData.classes) {
        throw new Error('រកមិនឃើញទិន្នន័យលើ Cloud ឡើយ!');
      }
      await db.importBackupJSON(JSON.stringify(cloudData));
      setStatusResult({
        action: 'pulled',
        success: true,
        message: '✅ បានទាញយកទិន្នន័យពី Cloud មកជំនួសលើឧបករណ៍នេះជោគជ័យ ១០០%!',
        timestamp: new Date().toISOString(),
      });
      setLastSyncTime(new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (onSuccess) onSuccess();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setStatusResult({
        action: 'error',
        success: false,
        message: `មិនអាចទាញយកបានទេ៖ ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs flex items-center gap-1.5 text-white">
              <Laptop className="w-5 h-5 text-emerald-200" />
              <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>សមកាលកម្មស្វ័យប្រវត្តិ (Auto-Sync)</span>
                <span className="text-[10px] bg-emerald-300 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  AUTO 100%
                </span>
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                កុំព្យូទ័រ ⇄ ទូរស័ព្ទដៃ ដូចគ្នា ១០០% ដោយស្វ័យប្រវត្តិ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Active Status Card */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping" />
                <span>ដំណើរការអូតូជាប្រចាំ (Zero-Touch 100%)</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {lastSyncTime ? `Sync ចុងក្រោយ៖ ម៉ោង ${lastSyncTime}` : 'កំពុងពិនិត្យ...'}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium mt-2">
              ✨ <strong>លោកគ្រូមិនបាច់ចុចប៊ូតុងអ្វីទាំងអស់!</strong> ប្រព័ន្ធត្រូវបានរៀបចំឱ្យ Sync ស្វ័យប្រវត្តិតាម Cloud Master Channel រួចជាស្រេច។ រាល់ពេលលោកគ្រូកត់វត្តមាន កែពិន្ទុ ឬកែប្រែទិន្នន័យលើទូរស័ព្ទដៃ ឬកុំព្យូទ័រ ទិន្នន័យនឹងត្រូវបញ្ជូន និងទាញយកដោយស្វ័យប្រវត្តិ ១០០% ភ្លាមៗ។
            </p>
          </div>

          {/* Real-time Status Feedback */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-2xl flex items-center gap-3">
            {isSyncing ? (
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin shrink-0" />
            ) : statusResult?.success ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            )}
            <div>
              <div className="text-xs font-black text-emerald-950">
                {isSyncing
                  ? 'កំពុងពិនិត្យ និង Sync ទិន្នន័យស្វ័យប្រវត្តិ...'
                  : statusResult?.message || '✨ ទិន្នន័យកុំព្យូទ័រ និងទូរស័ព្ទដៃដូចគ្នា ១០០% រួចរាល់។'}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">
                ប្រព័ន្ធដំណើរការផ្ទាល់ក្នុងផ្ទៃខាងក្រោយ (Background Auto-Sync) ដោយមិនរំខានលោកគ្រូឡើយ
              </div>
            </div>
          </div>

          {/* Channel Info Tag */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cloud Channel: <code className="font-mono font-bold text-slate-700">{topic}</code></span>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>សុវត្ថិភាព & ឯកជន</span>
            </span>
          </div>

          {/* Optional Collapsed Advanced Options (If ever manually needed) */}
          <details className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            <summary className="cursor-pointer text-slate-400 hover:text-slate-600 font-bold select-none py-1">
              ⚙️ ជម្រើសកម្រិតខ្ពស់ (បើចង់បង្ខំ Sync ដោយដៃ)
            </summary>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleForcePush}
                disabled={isSyncing}
                className="py-2.5 px-3 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 active:scale-95 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="យកទិន្នន័យពីឧបករណ៍នេះបង្ហោះទៅ Cloud"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5 text-blue-600" />
                <span>បង្ហោះឡើង Cloud</span>
              </button>

              <button
                type="button"
                onClick={handleForcePull}
                disabled={isSyncing}
                className="py-2.5 px-3 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 active:scale-95 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="ទាញយកទិន្នន័យចុងក្រោយពី Cloud មកដាក់លើឧបករណ៍នេះ"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                <span>ទាញយកពី Cloud</span>
              </button>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            យល់ព្រម / បិទ
          </button>
        </div>
      </div>
    </div>
  );
};
