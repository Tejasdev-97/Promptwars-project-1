import { useMemo } from 'react';
import { GoogleMap, useLoadScript, HeatmapLayer } from '@react-google-maps/api';
import { useCrowdData } from '../../hooks/useCrowdData';

const mapContainerStyle = { width: '100%', height: '100%' };
const center = { lat: 18.9388, lng: 72.8258 };

export const CrowdHeatmap = () => {
   const { isLoaded } = useLoadScript({
      googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || 'demo-key',
      libraries: ['visualization']
   });
   
   const { zones } = useCrowdData();

   const heatmapData = useMemo(() => {
      // Create mock lat/lng spread based on capacity/crowdCount since we don't have real coordinates for zones
      // In a real app, zones would have center coordinates or polygons
      if (!window.google) return [];
      const points: any[] = [];
      zones.forEach((zone, index) => {
         const density = zone.crowdCount / zone.capacity;
         // Use deterministic pseudo-random offset based on index to ensure purity
         const pseudoRandom = ((index * 29) % 100) / 100;
         const pseudoRandom2 = ((index * 17) % 100) / 100;
         const latOffset = (pseudoRandom - 0.5) * 0.002;
         const lngOffset = (pseudoRandom2 - 0.5) * 0.002;
         points.push({
            location: new window.google.maps.LatLng(center.lat + latOffset, center.lng + lngOffset),
            weight: density * 10
         });
      });
      return points;
   }, [zones]);

   if (!isLoaded) return <div className="h-full animate-pulse bg-gray-800 rounded-lg"></div>;

   return (
      <GoogleMap
         mapContainerStyle={mapContainerStyle}
         zoom={17}
         center={center}
         options={{
            disableDefaultUI: true,
            mapTypeId: 'satellite'
         }}
      >
         {heatmapData.length > 0 && (
            <HeatmapLayer
               data={heatmapData}
               options={{
                  radius: 40,
                  opacity: 0.8,
                  gradient: [
                     "rgba(0, 255, 255, 0)",
                     "rgba(0, 255, 255, 1)",
                     "rgba(0, 191, 255, 1)",
                     "rgba(0, 127, 255, 1)",
                     "rgba(0, 63, 255, 1)",
                     "rgba(0, 0, 255, 1)",
                     "rgba(0, 0, 223, 1)",
                     "rgba(0, 0, 191, 1)",
                     "rgba(0, 0, 159, 1)",
                     "rgba(0, 0, 127, 1)",
                     "rgba(63, 0, 91, 1)",
                     "rgba(127, 0, 63, 1)",
                     "rgba(191, 0, 31, 1)",
                     "rgba(255, 0, 0, 1)"
                  ]
               }}
            />
         )}
      </GoogleMap>
   );
};
