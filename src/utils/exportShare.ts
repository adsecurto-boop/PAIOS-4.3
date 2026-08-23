import { Share } from '@capacitor/share';
import { PAIOSStorage } from '../storage';

export interface ExportResult {
  success: boolean;
  method: 'share_api' | 'capacitor_share' | 'download' | 'cancelled';
  message: string;
}

export async function exportAndShareBackup(mode: 'share' | 'download' = 'share'): Promise<ExportResult> {
  const backupJson = PAIOSStorage.exportBackupJson();
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `paios_backup_${dateStr}.json`;
  const file = new File([backupJson], fileName, { type: 'application/json' });

  if (mode === 'share') {
    // 1. Try Web Share API with File (Works on Android Chrome / WebViews / iOS Safari)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'PAIOS Backup JSON',
          text: 'PAIOS Data Backup file. Save to Phone File Manager or share.',
          files: [file],
        });
        return {
          success: true,
          method: 'share_api',
          message: 'Opened Android Share Sheet. Saved/shared backup file successfully!',
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return {
            success: false,
            method: 'cancelled',
            message: 'Share intent cancelled by user.',
          };
        }
        console.warn('Web Share API with files failed, attempting Capacitor Native Share:', err);
      }
    }

    // 2. Try Capacitor Native Share plugin (for Android APK container)
    try {
      const canShareNative = await Share.canShare();
      if (canShareNative.value) {
        const base64Data = btoa(unescape(encodeURIComponent(backupJson)));
        const dataUrl = `data:application/json;base64,${base64Data}`;
        await Share.share({
          title: 'PAIOS Backup JSON',
          text: 'Save PAIOS Backup file to your device file manager.',
          url: dataUrl,
          dialogTitle: 'Save PAIOS Backup File',
        });
        return {
          success: true,
          method: 'capacitor_share',
          message: 'Capacitor Share Sheet launched!',
        };
      }
    } catch (capErr) {
      console.warn('Capacitor share plugin attempt skipped:', capErr);
    }
  }

  // 3. Fallback / Direct Download
  const blob = new Blob([backupJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    success: true,
    method: 'download',
    message: `Saved ${fileName} to Downloads folder.`,
  };
}
