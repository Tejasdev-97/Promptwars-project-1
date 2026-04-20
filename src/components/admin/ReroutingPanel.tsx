import { useState, useEffect, useCallback } from 'react';
import { generateReroutingSuggestion } from '../../services/geminiService';
import { useCrowdData } from '../../hooks/useCrowdData';
import { Cpu, Send, RefreshCw } from 'lucide-react';

export const ReroutingPanel = () => {
   const { zones } = useCrowdData();
   const [suggestion, setSuggestion] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   const evaluateCrowd = useCallback(async () => {
      setLoading(true);
      try {
         const result = await generateReroutingSuggestion(zones);
         setSuggestion(result);
      } catch (err) {
         console.error(err);
      }
      setLoading(false);
   }, [zones]);

   // Auto-evaluate every 2 mins simulated by useEffect with interval depending on real app
   useEffect(() => {
     const interval = setInterval(evaluateCrowd, 120000);
     return () => clearInterval(interval);
   }, [evaluateCrowd]); // Note: In reality might not want to re-trigger on every zone update

   const handleBroadcast = () => {
      alert(`Broadcast sent to ${suggestion?.targetZone}: ${suggestion?.suggestion}`);
      // Would hit firebase broadcast collection here
   };

   return (
      <div className="bg-admin-bg border border-admin-highlight/30 p-6 rounded-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-5">
            <Cpu size={100} />
         </div>
         <div className="flex justify-between items-start mb-4 relative z-10">
            <h3 className="text-xl font-bold text-white flex items-center">
               <Cpu className="text-admin-highlight mr-2" size={24} /> AI Rerouting Engine
            </h3>
            <button onClick={evaluateCrowd} className="text-gray-400 hover:text-white" disabled={loading}>
               <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
         </div>

         {!suggestion && !loading && (
            <div className="text-gray-400 py-4">Click refresh to analyze Live Crowd...</div>
         )}
         
         {loading && (
            <div className="text-admin-highlight py-4 animate-pulse uppercase tracking-widest font-bold text-sm">Validating Corridors...</div>
         )}

         {suggestion && !loading && (
            <div className="space-y-4 relative z-10">
               <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Target Relief Zone</div>
                  <div className="text-2xl font-bold text-admin-highlight">{suggestion.targetZone}</div>
               </div>
               
               <p className="text-white text-lg">"{suggestion.suggestion}"</p>
               
               <div className="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-700">
                  <span className="text-sm text-gray-400">Estimated Relief: <span className="font-bold text-white">{suggestion.estimatedReliefTimeMin} mins</span></span>
                  <button onClick={handleBroadcast} className="bg-admin-highlight text-black font-bold px-4 py-2 rounded flex items-center hover:opacity-90">
                     <Send size={16} className="mr-2" /> Broadcast Alert
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};
