import { useEffect } from 'react';
import { runGmailSync } from '../services/gmailSync';
import { useToast } from '../ToastContext';

export function useGlobalSync() {
  const { showToast } = useToast();

  useEffect(() => {
    const handleManualGmailSync = async () => {
      try {
        const count = await runGmailSync(false);
        if (count > 0) {
          showToast(`Synced ${count} new transactions from Gmail!`, 'success');
        } else {
          showToast(`No new transactions found from Gmail.`, 'info');
        }
      } catch (err: any) {
         if (err.message !== "Not authenticated for Gmail") {
            console.error(err);
            showToast("Failed to sync Gmail", "error");
         } else {
            showToast("Authenticate with Google in Expense Tracker first", "error");
         }
      }
    };

    window.addEventListener('manual-sync-gmail', handleManualGmailSync);

    const autoSyncGmail = async () => {
       const isEnabled = localStorage.getItem('isGmailSyncEnabled') !== 'false';
       if (!isEnabled) return;
       try {
           await runGmailSync(true); // silent
       } catch(e) {}
    };

    const interval = setInterval(autoSyncGmail, 10 * 60 * 1000); // every 10 min

    return () => {
      window.removeEventListener('manual-sync-gmail', handleManualGmailSync);
      clearInterval(interval);
    };
  }, [showToast]);
}
