import { useState, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { collection, onSnapshot, query } from 'firebase/firestore';

export const useCrowdData = (stadiumId: string = 'wankhede_stadium') => {
   const [zones, setZones] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      let hasData = false;
      const timeoutId = setTimeout(() => {
          if (!hasData) {
              console.log('Timeout reached. Using fallback mock crowd zones');
              setZones([
                  { id: 'zone_a', capacity: 1000, crowdCount: 300, name: 'North Stand' },
                  { id: 'zone_b', capacity: 1000, crowdCount: 850, name: 'South Pavilion' }
              ]);
              setLoading(false);
          }
      }, 1000);

      const q = query(collection(db, 'stadiums', stadiumId, 'zones'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
         hasData = true;
         clearTimeout(timeoutId);
         if (snapshot.empty) {
             console.log('Using fallback mock crowd zones');
             setZones([
                 { id: 'zone_a', capacity: 1000, crowdCount: 300, name: 'North Stand' },
                 { id: 'zone_b', capacity: 1000, crowdCount: 850, name: 'South Pavilion' }
             ]);
         } else {
             const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             setZones(data);
         }
         setLoading(false);
      }, (err) => {
         hasData = true;
         clearTimeout(timeoutId);
         setZones([
             { id: 'zone_a', capacity: 1000, crowdCount: 300, name: 'North Stand' },
             { id: 'zone_b', capacity: 1000, crowdCount: 850, name: 'South Pavilion' }
         ]);
         setLoading(false);
      });
      return () => {
         clearTimeout(timeoutId);
         unsubscribe();
      };
   }, [stadiumId]);

   return { zones, loading };
};
