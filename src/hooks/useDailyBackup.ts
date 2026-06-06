import { useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { fetchCollection } from '../api';

export function useDailyBackup() {
  useEffect(() => {
    const runBackup = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Only run backup if online
        if (!navigator.onLine) return;

        const todayTimestamp = new Date().setHours(0, 0, 0, 0);
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Check if backup for today already exists
        const backupsRef = collection(db, 'backups');
        const q = query(
          backupsRef, 
          where('ownerId', '==', user.uid),
          where('dateStr', '==', todayStr),
          limit(1)
        );
        
        const existingBackups = await getDocs(q);
        if (!existingBackups.empty) {
          // Backup already exists for today
          return;
        }

        // Fetch current state
        const [notes, tasks, expenses] = await Promise.all([
          fetchCollection('notes'),
          fetchCollection('assignments'),
          fetchCollection('expenses')
        ]);

        const backupData = {
          ownerId: user.uid,
          dateStr: todayStr,
          timestamp: Date.now(),
          metadata: {
            notesCount: notes.length,
            tasksCount: tasks.length,
            expensesCount: expenses.length,
          },
          snapshot: JSON.stringify({ notes, tasks, expenses }),
          version: '1.0'
        };

        // Save backup directly
        const backupId = `backup_${user.uid}_${todayStr}`;
        window.dispatchEvent(new Event('cloud-sync-start'));
        try {
          await setDoc(doc(db, 'backups', backupId), backupData);
        } finally {
          window.dispatchEvent(new Event('cloud-sync-end'));
        }
      } catch (error) {
        console.error("Failed to run automated backup:", error);
      }
    };

    // Delay checking for 5 seconds to not block un-auth startup
    const timer = setTimeout(() => {
      runBackup();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);
}
