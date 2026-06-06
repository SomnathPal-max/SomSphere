import { useEffect, useRef } from 'react';
import { apiFetch, createItem, fetchCollection } from '../api';
import { auth } from '../firebase';

export function useNoticeNotifications() {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkNotices = async (force = false) => {
      const isEnabled = localStorage.getItem('isNoticeSyncEnabled') !== 'false';
      if (!isEnabled && !force) return;

      if (!auth.currentUser) {
        // Safe return if the user is not authenticated yet
        return;
      }

      try {
        // Fetch existing saved notices to avoid duplicates
        const existingDB = await fetchCollection('announcements');
        const existingIds = new Set(existingDB.filter(a => a.isCollegeNotice).map(a => a.originalId));

        // Background serverless function fetches latest HTML
        const notices = await apiFetch('/api/college-notices');
        
        if (!Array.isArray(notices)) {
          console.warn("Expected college-notices endpoint to return an array, got:", notices);
          return;
        }

        const seenIds = seenIdsRef.current;
        const currentIsFirstLoad = isFirstLoadRef.current;
        let newCount = 0;

        for (const notice of notices) {
           if (!seenIds.has(notice.id)) {
             seenIds.add(notice.id);

             // If not in firestore yet, store it
             if (!existingIds.has(notice.id)) {
                 await createItem('announcements', {
                     title: notice.title ? notice.title.substring(0, 900) : "Notice",
                     body: notice.body ? notice.body.substring(0, 4000) : "",
                     category: 'COLLEGE',
                     postedAt: notice.postedAt,
                     pinned: notice.pinned,
                     originalId: notice.id,
                     isCollegeNotice: true
                 }).catch(err => console.error("Firestore Error:", JSON.stringify(err)));
                 newCount++;
                 
                 // Desktop notification for new items
                 if (!currentIsFirstLoad && notice.pinned) {
                   if ('Notification' in window && Notification.permission === 'granted') {
                     new Notification('Urgent College Notice', {
                       body: notice.title,
                       icon: '/favicon.ico'
                     });
                   }
                 }
             }
           }
        }
        
        if (currentIsFirstLoad) {
           isFirstLoadRef.current = false;
        }

        if (force) {
           // Provide feedback on manual sync
           if (newCount > 0) {
             console.log(`Synced ${newCount} new notices`);
           }
        }
      } catch (err) {
        console.warn("Background notice check temporarily offline or failed", err);
      }
    };

    const handleManualSync = () => {
       checkNotices(true);
    };

    window.addEventListener('manual-sync-notices', handleManualSync);

    checkNotices();
    const interval = setInterval(() => checkNotices(false), 5 * 60 * 1000);

    return () => {
       clearInterval(interval);
       window.removeEventListener('manual-sync-notices', handleManualSync);
    };
  }, []);
}
