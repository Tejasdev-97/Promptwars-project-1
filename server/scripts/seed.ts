import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Usage: Run with node and GOOGLE_APPLICATION_CREDENTIALS set or pass serviceAccountKey.json
const seedWankhede = async () => {
   const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
   if(!fs.existsSync(serviceAccountPath)){
       console.log("No serviceAccountKey.json found, skipping seeding demo data.");
       return;
   }
   
   const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
   
   initializeApp({
      credential: cert(serviceAccount)
   });

   const db = getFirestore();
   const stadiumId = "wankhede_stadium";

   console.log("Seeding Wankhede Stadium demo data...");

   // 8 entry gates, 6 food zones, 20 restroom blocks, 4 parking exits
   const zones = [];
   for(let i=1; i<=8; i++) zones.push({ id: `gate_${i}`, name: `Entry Gate ${i}`, capacity: 2000, type: 'GATE' });
   for(let i=1; i<=6; i++) zones.push({ id: `food_${i}`, name: `Food Court ${i}`, capacity: 1500, type: 'FOOD' });
   for(let i=1; i<=20; i++) zones.push({ id: `restroom_${i}`, name: `Restroom Block ${i}`, capacity: 300, type: 'RESTROOM' });
   for(let i=1; i<=4; i++) zones.push({ id: `parking_${i}`, name: `Parking Exit ${i}`, capacity: 5000, type: 'PARKING' });

   const batch = db.batch();

   zones.forEach(zone => {
      const ref = db.collection('stadiums').doc(stadiumId).collection('zones').doc(zone.id);
      // Simulate live IPL match at ~80% capacity
      const currentCrowd = Math.floor(Math.random() * (zone.capacity * 0.9)); 
      batch.set(ref, {
         name: zone.name,
         capacity: zone.capacity,
         crowdCount: currentCrowd,
         type: zone.type,
         lastUpdated: new Date().toISOString()
      });
   });

   // Queues for food and restrooms
   const queuePoints = zones.filter(z => z.type === 'FOOD' || z.type === 'RESTROOM' || z.type === 'GATE');
   queuePoints.forEach(qp => {
      const qRef = db.collection('stadiums').doc(stadiumId).collection('queues').doc(`q_${qp.id}`);
      batch.set(qRef, {
         location: qp.name,
         currentWait: Math.floor(Math.random() * 20), // 0 to 20 mins
         trend: Math.random() > 0.5 ? 'rising' : 'falling',
         lastUpdated: new Date().toISOString()
      });
   });

   await batch.commit();
   console.log("Done seeding demo data!");
};

seedWankhede().catch(console.error);
