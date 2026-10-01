import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FarmerDashboard from './pages/FarmerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import TransporterDashboard from './pages/TransporterDashboard';
import Farmers from './pages/Farmers';
import Buyers from './pages/Buyers';
import Transport from './pages/Transport';
import AICoordination from './pages/AICoordination';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/landing';
  const isFarmerPage = location.pathname === '/farmer-dashboard';
  const isBuyerPage = location.pathname === '/buyer-dashboard';
  const isTransporterPage = location.pathname === '/transporter-dashboard';

  return (
    <div className="min-h-screen bg-surface-50">
      {!isAuthPage && !isFarmerPage && !isBuyerPage && !isTransporterPage && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
        <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
        <Route path="/transporter-dashboard" element={<TransporterDashboard />} />
        <Route path="/farmers" element={<Farmers />} />
        <Route path="/buyers" element={<Buyers />} />
        <Route path="/transport" element={<Transport />} />
        <Route path="/coordination" element={<AICoordination />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
