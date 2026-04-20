import { useQueueData } from '../../hooks/useQueueData';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

export const QueueMonitor = () => {
   const { queues, loading } = useQueueData();

   return (
      <div className="bg-admin-bg border border-gray-700 rounded-xl overflow-hidden">
         <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
            <h3 className="font-bold text-lg text-white">Live Queue Monitor</h3>
            <span className="bg-admin-highlight text-black text-xs font-bold px-2 py-1 rounded">Updates Real-time</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
               <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                  <tr>
                     <th className="px-4 py-3">Location</th>
                     <th className="px-4 py-3">Current Wait</th>
                     <th className="px-4 py-3">Trend</th>
                     <th className="px-4 py-3">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {loading ? (
                     <tr><td colSpan={4} className="text-center py-4">Loading queue telemetry...</td></tr>
                  ) : queues.map((q, i) => (
                     <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-white">{q.location}</td>
                        <td className={`px-4 py-3 font-bold ${q.currentWait > 15 ? 'text-red-500' : 'text-green-500'}`}>
                           {q.currentWait} mins
                        </td>
                        <td className="px-4 py-3">
                           {q.trend === 'rising' ? <TrendingUp size={16} className="text-red-500" /> : <TrendingDown size={16} className="text-green-500" />}
                        </td>
                        <td className="px-4 py-3">
                           {q.currentWait > 15 && <AlertCircle size={16} className="text-red-500 inline mr-1" />}
                           {q.currentWait > 15 ? 'Critical' : 'Normal'}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};
