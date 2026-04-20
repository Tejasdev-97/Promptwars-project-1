import { useState } from 'react';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { predictQueueSpike } from '../../services/geminiService';

export const QueueCard = ({ queue }: { queue: any }) => {
   const [prediction, setPrediction] = useState<{predictedWait: number, confidence: number} | null>(null);

   const waitTime = queue.currentWait;
   let colorClass = "text-green-400";
   let barClass = "bg-green-400";
   if (waitTime > 5) { colorClass = "text-yellow-400"; barClass = "bg-yellow-400"; }
   if (waitTime > 15) { colorClass = "text-red-400"; barClass = "bg-red-400"; }

   const handlePredict = async () => {
      try {
         const res = await predictQueueSpike(queue.location, "Innings logic/Halftime demo", waitTime);
         setPrediction(res);
      } catch (err) { }
   };

   return (
      <div className="bg-app-card border border-app-border p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
         <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg text-app-text">{queue.location}</h3>
            {queue.trend === 'rising' ? <TrendingUp size={18} className="text-red-500" /> : <TrendingDown size={18} className="text-green-500" />}
         </div>
         
         <div className="flex items-end mb-3">
            <Clock size={24} className={`mr-2 ${colorClass}`} />
            <span className={`text-3xl font-black ${colorClass}`}>{waitTime}</span>
            <span className="text-sm text-gray-500 font-semibold ml-1 mb-1">min wait</span>
         </div>
         
         {/* Live Crowd Level Bar */}
         <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mb-4">
           <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${Math.min(100, (waitTime / 30) * 100)}%` }}></div>
         </div>

         {!prediction ? (
            <button onClick={handlePredict} className="text-xs font-bold text-secondary hover:opacity-80 transition-opacity uppercase tracking-wider">
               Predict wait time in 10 mins
            </button>
         ) : (
            <div className="text-xs bg-app-bg border border-app-border p-3 rounded-lg text-app-text">
               <span className="font-black text-secondary">AI Prediction:</span> {prediction.predictedWait} mins 
               <span className="text-gray-500 font-semibold ml-1">({prediction.confidence}% confidence)</span>
            </div>
         )}
      </div>
   );
};
