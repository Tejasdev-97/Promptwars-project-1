import { useState, useEffect } from 'react';
import { Eye, Type } from 'lucide-react';

export const AccessibilityToggle = () => {
   const [highContrast, setHighContrast] = useState(false);
   const [largeFont, setLargeFont] = useState(false);

   useEffect(() => {
     if (highContrast) document.body.classList.add('high-contrast');
     else document.body.classList.remove('high-contrast');
   }, [highContrast]);

   useEffect(() => {
     if (largeFont) document.body.classList.add('large-font');
     else document.body.classList.remove('large-font');
   }, [largeFont]);

   return (
      <div className="flex space-x-3 items-center" aria-label="Accessibility settings">
         <button 
           onClick={() => setHighContrast(!highContrast)} 
           className={`p-2 rounded-full ${highContrast ? 'bg-secondary text-primary' : 'bg-white/10 hover:bg-white/20'}`}
           aria-pressed={highContrast}
           aria-label="Toggle High Contrast"
         >
           <Eye size={20} />
         </button>
         <button 
           onClick={() => setLargeFont(!largeFont)}
           className={`p-2 rounded-full ${largeFont ? 'bg-secondary text-primary' : 'bg-white/10 hover:bg-white/20'}`}
           aria-pressed={largeFont}
           aria-label="Toggle Large Font Size"
         >
           <Type size={20} />
         </button>
      </div>
   );
};
