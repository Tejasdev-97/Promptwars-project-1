import { useState, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { collection, onSnapshot, query } from 'firebase/firestore';

export const useQueueData = (stadiumId: string = 'wankhede_stadium') => {
   const [queues, setQueues] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      let hasData = false;
      const timeoutId = setTimeout(() => {
          if (!hasData) {
              console.log('Timeout reached. Using fallback mock queues');
              setQueues([
                  { id: '1', location: 'Gate A Entry', currentWait: 12, trend: 'steady' },
                  { id: '2', location: 'Level 1 Food Court', currentWait: 22, trend: 'rising' },
                  { id: '3', location: 'Washroom Block C', currentWait: 4, trend: 'falling' }
              ]);
              setLoading(false);
          }
      }, 1000);

      const q = query(collection(db, 'stadiums', stadiumId, 'queues'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
         hasData = true;
         clearTimeout(timeoutId);
         if (snapshot.empty) {
            // Fallback mock data if database hasn't been seeded yet
            console.log('Using fallback mock queues');
            setQueues([
                { id: '1', location: 'Gate A Entry', currentWait: 12, trend: 'steady' },
                { id: '2', location: 'Level 1 Food Court', currentWait: 22, trend: 'rising' },
                { id: '3', location: 'Washroom Block C', currentWait: 4, trend: 'falling' }
            ]);
         } else {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQueues(data);
         }
         setLoading(false);
      }, (err) => {
         hasData = true;
         clearTimeout(timeoutId);
         setQueues([
             { id: '1', location: 'Gate A Entry', currentWait: 12, trend: 'steady' },
             { id: '2', location: 'Level 1 Food Court', currentWait: 22, trend: 'rising' },
             { id: '3', location: 'Washroom Block C', currentWait: 4, trend: 'falling' }
         ]);
         setLoading(false);
      });
      return () => {
         clearTimeout(timeoutId);
         unsubscribe();
      };
   }, [stadiumId]);

   return { queues, loading };
};
