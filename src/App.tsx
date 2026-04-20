import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AttendeePage } from './components/attendee/AttendeePage';
import { AdminDashboard } from './components/admin/AdminDashboard';

const App = () => {
   return (
      <Router>
         <Routes>
            <Route path="/" element={<AttendeePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
         </Routes>
      </Router>
   );
};

export default App;
