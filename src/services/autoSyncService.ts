import { db } from '../db/db';

export const MASTER_AUTO_SYNC_TOPIC = 'kh-hunratha-master-cloud';
const LAST_LOCAL_UPDATE_KEY = 'last_local_data_update';
const LAST_CLOUD_SYNC_KEY = 'last_cloud_sync_timestamp';
const AUTO_SYNC_ENABLED_KEY = 'auto_sync_enabled';

export interface AutoSyncResult {
  action: 'pulled' | 'pushed' | 'synced' | 'offline' | 'error';
  success: boolean;
  message: string;
  timestamp: string;
}

/**
 * Get current sync topic (allows custom topic if teacher configured in settings)
 */
export function getSyncTopic(): string {
  if (typeof window === 'undefined') return MASTER_AUTO_SYNC_TOPIC;
  return localStorage.getItem('custom_sync_topic') || MASTER_AUTO_SYNC_TOPIC;
}

export function isAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(AUTO_SYNC_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

export function setAutoSyncEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_SYNC_ENABLED_KEY, String(enabled));
}

/**
 * Mark that local data has changed (calls debounced background cloud push)
 */
let debouncePushTimer: any = null;
export function notifyLocalDataChanged(triggerDebouncedUpload = true) {
  if (typeof window === 'undefined') return;
  const now = new Date().toISOString();
  localStorage.setItem(LAST_LOCAL_UPDATE_KEY, now);

  if (triggerDebouncedUpload && isAutoSyncEnabled()) {
    if (debouncePushTimer) clearTimeout(debouncePushTimer);
    debouncePushTimer = setTimeout(() => {
      autoPushToCloud().catch(console.error);
    }, 4000);
  }
}

/**
 * Push current local database snapshot to Cloud Master Channel
 */
export async function autoPushToCloud(): Promise<boolean> {
  if (typeof window === 'undefined' || !isAutoSyncEnabled()) return false;
  const topic = getSyncTopic();

  try {
    const backupStr = await db.exportBackupJSON();
    const now = new Date().toISOString();
    localStorage.setItem(LAST_LOCAL_UPDATE_KEY, now);

    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'PUT',
      headers: {
        Filename: 'backup.json',
        Title: 'Hun Ratha Attendance AutoSync',
        Tags: 'autosync,cambodia,education',
      },
      body: backupStr,
    });

    if (res.ok) {
      localStorage.setItem(LAST_CLOUD_SYNC_KEY, now);
      console.log('☁️ Auto-sync: Local data successfully pushed to Cloud Master.');
      return true;
    }
  } catch (err) {
    console.warn('Auto-sync push deferred (offline or network issue):', err);
  }
  return false;
}

/**
 * Pull and download the latest data snapshot from Cloud Master Channel
 */
export async function autoPullFromCloud(): Promise<any | null> {
  if (typeof window === 'undefined' || !isAutoSyncEnabled()) return null;
  const topic = getSyncTopic();

  try {
    // 1. Try polling message attachments
    const pollRes = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`, {
      cache: 'no-store',
    });

    if (pollRes.ok) {
      const text = await pollRes.text();
      const lines = text.trim().split('\n').filter(Boolean);

      // Iterate from newest message backward
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const msg = JSON.parse(lines[i]);
          if (msg.attachment?.url) {
            const fileRes = await fetch(msg.attachment.url, { cache: 'no-store' });
            if (fileRes.ok) {
              const fileText = await fileRes.text();
              if (fileText && fileText.trim().startsWith('{')) {
                const parsed = JSON.parse(fileText);
                if (parsed.classes && Array.isArray(parsed.classes)) {
                  return parsed;
                }
              }
            }
          }
          if (msg.message && msg.message.trim().startsWith('{')) {
            const parsed = JSON.parse(msg.message);
            if (parsed.classes && Array.isArray(parsed.classes)) {
              return parsed;
            }
          }
        } catch {
          // continue checking earlier messages
        }
      }
    }

    // 2. Direct raw fallback
    const rawRes = await fetch(`https://ntfy.sh/${topic}/raw`, { cache: 'no-store' });
    if (rawRes.ok) {
      const rawText = await rawRes.text();
      if (rawText && rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText);
        if (parsed.classes && Array.isArray(parsed.classes)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Auto-sync pull deferred (offline or network issue):', err);
  }

  return null;
}

/**
 * Perform Bidirectional Auto-Sync:
 * - Compares cloud backup date vs local last update date
 * - Pulls if cloud is newer
 * - Pushes if local is newer (or if forced)
 */
export async function performAutoSync(forcePush = false): Promise<AutoSyncResult> {
  const now = new Date().toISOString();
  if (typeof window === 'undefined' || !isAutoSyncEnabled()) {
    return {
      action: 'offline',
      success: false,
      message: 'មុខងារ Auto-Sync ត្រូវបានបិទ។',
      timestamp: now,
    };
  }

  if (forcePush) {
    const pushed = await autoPushToCloud();
    return {
      action: 'pushed',
      success: pushed,
      message: pushed
        ? '✅ បានបង្ហោះទិន្នន័យពីឧបករណ៍នេះឡើង Cloud ដោយជោគជ័យ!'
        : '⚠️ មិនអាចបង្ហោះបានទេ សូមពិនិត្យមើលអ៊ីនធឺណិត។',
      timestamp: now,
    };
  }

  try {
    const cloudData = await autoPullFromCloud();
    const localLastUpdate = localStorage.getItem(LAST_LOCAL_UPDATE_KEY) || '1970-01-01T00:00:00.000Z';
    const localClassesCount = await db.classes.count();

    // If cloud has valid data
    if (cloudData && cloudData.exportDate) {
      const cloudTime = new Date(cloudData.exportDate).getTime();
      const localTime = new Date(localLastUpdate).getTime();

      // If local has 0 classes OR cloud is newer by more than 2 seconds
      if (localClassesCount === 0 || cloudTime > localTime + 2000) {
        console.log('📥 Cloud data is newer! Auto-importing into local database...');
        await db.importBackupJSON(JSON.stringify(cloudData));
        localStorage.setItem(LAST_LOCAL_UPDATE_KEY, cloudData.exportDate);
        localStorage.setItem(LAST_CLOUD_SYNC_KEY, new Date().toISOString());

        return {
          action: 'pulled',
          success: true,
          message: '✅ បានទាញយកទិន្នន័យថ្មីពី Cloud ចូលឧបករណ៍នេះដោយស្វ័យប្រវត្តិ!',
          timestamp: new Date().toISOString(),
        };
      } else if (localTime > cloudTime + 2000) {
        // Local is newer: push to cloud so other devices get it
        console.log('📤 Local data is newer! Auto-pushing to Cloud Master...');
        await autoPushToCloud();
        return {
          action: 'pushed',
          success: true,
          message: '✅ បានបង្ហោះទិន្នន័យថ្មីឡើង Cloud ដោយស្វ័យប្រវត្តិ!',
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          action: 'synced',
          success: true,
          message: '✨ ទិន្នន័យកុំព្យូទ័រ និងទូរស័ព្ទដៃដូចគ្នា ១០០% រួចរាល់។',
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      // Cloud is empty yet local has data: push local to initialize cloud
      if (localClassesCount > 0) {
        await autoPushToCloud();
        return {
          action: 'pushed',
          success: true,
          message: '✅ បានផ្តួចផ្តើមទិន្នន័យឡើង Cloud ដោយស្វ័យប្រវត្តិ!',
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (err: any) {
    console.error('AutoSync execution error:', err);
    return {
      action: 'error',
      success: false,
      message: `មានបញ្ហាក្នុងការ Sync៖ ${err.message || 'សូមពិនិត្យមើលអ៊ីនធឺណិត'}`,
      timestamp: now,
    };
  }

  return {
    action: 'synced',
    success: true,
    message: '✨ ទិន្នន័យកុំព្យូទ័រ និងទូរស័ព្ទដៃដូចគ្នា ១០០%។',
    timestamp: now,
  };
}

/**
 * Setup background listeners for seamless automatic synchronization:
 * - On app boot (runs immediately)
 * - On visibilitychange / window focus (e.g. user opens phone or switches tabs)
 * - Periodic light heartbeat (every 2 minutes)
 */
export function initAutoSyncEngine(onSyncSuccess?: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Initial boot sync
  setTimeout(() => {
    performAutoSync().then((res) => {
      if (res.action === 'pulled' && res.success) {
        onSyncSuccess?.();
      }
    }).catch(console.error);
  }, 1500);

  // 2. Sync on focus or phone screen unlock
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible') {
      performAutoSync().then((res) => {
        if (res.action === 'pulled' && res.success) {
          onSyncSuccess?.();
        }
      }).catch(console.error);
    }
  };

  window.addEventListener('visibilitychange', handleVisibilityOrFocus);
  window.addEventListener('focus', handleVisibilityOrFocus);

  // 3. Periodic light background poll (every 2.5 minutes)
  const intervalId = setInterval(() => {
    if (document.visibilityState === 'visible') {
      performAutoSync().then((res) => {
        if (res.action === 'pulled' && res.success) {
          onSyncSuccess?.();
        }
      }).catch(console.error);
    }
  }, 150000);

  return () => {
    window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    clearInterval(intervalId);
  };
}
