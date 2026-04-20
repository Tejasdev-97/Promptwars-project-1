// Language config

const languages = [
  { code: 'en-US', name: 'English' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'mr-IN', name: 'Marathi' }
];

export const LanguageSelector = ({ selected, onChange }: { selected: string, onChange: (code: string) => void }) => {
   return (
      <select 
         value={selected} 
         onChange={(e) => onChange(e.target.value)}
         className="bg-app-bg border border-app-border text-app-text text-sm rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-secondary focus:border-secondary outline-none shadow-sm transition-colors cursor-pointer"
         aria-label="Select preferred language"
      >
         {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
               {lang.name}
            </option>
         ))}
      </select>
   );
};
