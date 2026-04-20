import { useState } from 'react';
import { getOptimalGate } from '../../services/geminiService';
import { useCrowdData } from '../../hooks/useCrowdData';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

export const GateRecommender = ({ seatBlock }: { seatBlock: string }) => {
   const { zones } = useCrowdData();
   const [recommendation, setRecommendation] = useState<{gate: string, reasoning: string} | null>(null);
   const [loading, setLoading] = useState(false);

   const findGate = async () => {
      setLoading(true);
      try {
         // Filter only gates
         const gateData = zones.filter(z => z.type === 'GATE');
         const result = await getOptimalGate(seatBlock, gateData);
         setRecommendation(result);
      } catch (err) {
         console.error('Failed to get recommendation', err);
      }
      setLoading(false);
   };

   return (
      <div className="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-5 text-app-text">
            <MapPin size={100} />
         </div>
         <h2 className="text-2xl font-black mb-2 text-app-text relative z-10">Smart Gate Entry</h2>
         <p className="text-sm text-gray-500 font-semibold mb-6 relative z-10">Your seat: <span className="font-bold text-app-text">{seatBlock}</span></p>

         {!recommendation && !loading && (
            <button 
               onClick={findGate}
               className="bg-secondary text-white font-bold py-3.5 px-6 rounded-full flex items-center space-x-2 w-full justify-center hover:opacity-90 transition-opacity shadow-md relative z-10"
            >
               <Navigation size={18} />
               <span>Find Optimal Gate</span>
            </button>
         )}

         {loading && (
            <div className="flex justify-center items-center py-6 relative z-10">
               <Loader2 className="animate-spin text-secondary" size={32} />
               <span className="ml-3 text-sm text-gray-500 font-bold">AI analyzing live crowds...</span>
            </div>
         )}

         {recommendation && !loading && (
            <div className="bg-app-bg p-5 rounded-xl border border-secondary/50 mt-4 animate-in fade-in slide-in-from-bottom-4 relative z-10 shadow-sm">
               <div className="text-secondary font-black text-lg mb-2 flex items-center">
                  <Navigation size={18} className="mr-2" />
                  Recommended: {recommendation.gate}
               </div>
               <p className="text-sm text-app-text mt-2 italic font-medium leading-relaxed">"{recommendation.reasoning}"</p>
               <button onClick={findGate} className="mt-4 text-xs font-bold text-gray-500 hover:text-secondary uppercase tracking-widest transition-colors">Re-evaluate route</button>
            </div>
         )}
      </div>
   );
};
