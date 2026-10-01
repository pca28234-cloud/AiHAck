import React, { useEffect, useState } from 'react';
import { getVehicles, getFarmers, getBuyers } from '../services/api';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { Truck, Plus, Check, Sprout, ShoppingCart, X, AlertTriangle, LogOut, Route, MapPin, Activity, Wallet } from 'lucide-react';

export default function TransporterDashboard() {
  const [vehicle, setVehicle] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('farmers');
  const [routeFilter, setRouteFilter] = useState('active');
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [locationForm, setLocationForm] = useState({ location: '' });
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vRes, fRes, bRes] = await Promise.all([
        getVehicles(), getFarmers(), getBuyers()
      ]);
      
      if (vRes.data.length > 0) {
        const currentVehicle = vRes.data[0]; // Assuming first vehicle is the logged-in transporter
        setVehicle(currentVehicle);
        // Mock deliveries based on the transporter's ID
        setDeliveries([
          { id: 1, date: new Date().toISOString().split('T')[0], from: 'Kolar District', to: 'Bangalore City', quantity: 500, status: 'Active' },
          { id: 2, date: '2026-09-30', from: 'Tumkur', to: 'Mysore', quantity: 1200, status: 'Completed' }
        ]);
      }
      setFarmers(fRes.data);
      setBuyers(bRes.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    if (!vehicle) return;
    // Mock updating location
    setVehicle({ ...vehicle, current_location: locationForm.location });
    setShowLocationForm(false);
    setLocationForm({ location: '' });
    setSuccess('GPS location updated successfully! Routing optimized.');
  };

  const handleLogout = () => {
    navigate('/');
  };

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;
  if (!vehicle && !loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center text-stone-500">
      <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
      No transporter profile found.
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-50 font-sans pb-12" id="transporter-dashboard">
      
      {/* Transporter Specific Topbar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-stone-900 tracking-tight">
              Harvest<span className="text-violet-500">Link</span> AI
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Profile Menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-stone-900">Ramesh Logistics</p>
                <p className="text-xs text-stone-500">{vehicle.vehicle_number}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center border-2 border-violet-50">
                <span className="font-display font-bold text-violet-700">R</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-rose-500 transition-colors ml-2" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {success && <div className="mb-6 p-4 rounded-xl bg-violet-50 border border-violet-200 text-violet-800 text-sm animate-slide-up shadow-sm flex items-center gap-3"><Check className="w-5 h-5 text-violet-500" /> {success}</div>}
        {error && <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-slide-up shadow-sm flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-500" /> {error}</div>}

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Truck className="w-64 h-64 text-white transform rotate-12 translate-x-12 -translate-y-12" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-stone-400 font-medium mb-1">Welcome back, <span className="text-white">Ramesh Logistics</span></p>
              <h1 className="font-display text-4xl font-bold text-white tracking-tight">{vehicle.vehicle_number}</h1>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-stone-300">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-violet-400" /> Current Location: {vehicle.current_location}</span>
                <span className="flex items-center gap-1.5"><Route className="w-4 h-4 text-violet-400" /> Capacity: {vehicle.available_capacity} kg</span>
              </div>
            </div>
            <button onClick={() => setShowLocationForm(true)} className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-violet-500 text-white font-bold hover:bg-violet-400 transition-all shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-1">
              <Plus className="w-6 h-6" /> Update Location
            </button>
          </div>
        </div>

        {/* 2-Column Dashboard Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Delivery History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden h-full">
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Route className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl text-stone-900">Delivery Routes</h2>
                    <p className="text-sm text-stone-500">Your transport schedules</p>
                  </div>
                </div>
                
                {/* Filter Pills */}
                <div className="flex bg-stone-100 p-1 rounded-lg">
                  <button onClick={() => setRouteFilter('active')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${routeFilter === 'active' ? 'bg-white text-violet-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                    Active
                  </button>
                  <button onClick={() => setRouteFilter('completed')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${routeFilter === 'completed' ? 'bg-white text-violet-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                    History
                  </button>
                </div>
              </div>
              
              {deliveries.filter(d => routeFilter === 'active' ? d.status === 'Active' : d.status === 'Completed').length === 0 ? (
                <div className="p-16 text-center text-stone-400">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No {routeFilter} routes found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-stone-50/80 text-stone-500 font-semibold uppercase tracking-wider text-xs border-b border-stone-100">
                        <th className="px-8 py-4">Date</th>
                        <th className="px-8 py-4">Route</th>
                        <th className="px-8 py-4 text-center">Load</th>
                        <th className="px-8 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {deliveries.filter(d => routeFilter === 'active' ? d.status === 'Active' : d.status === 'Completed').map((d, i) => (
                        <tr key={d.id} className="hover:bg-stone-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <span className={`font-semibold ${routeFilter === 'active' && i === 0 ? 'text-stone-900' : 'text-stone-600'}`}>{d.date}</span>
                            {routeFilter === 'active' && i === 0 && <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-700">Live</span>}
                          </td>
                          <td className="px-8 py-5 text-stone-900 font-medium">
                            <div className="flex items-center gap-2">
                              <span>{d.from}</span>
                              <span className="text-stone-300">→</span>
                              <span>{d.to}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center font-display font-bold text-stone-900">
                            {d.quantity} <span className="text-xs font-sans text-stone-500 font-normal">kg</span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                              d.status === 'Active' ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                              'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Action Center */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden h-full flex flex-col">
              <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3 bg-stone-50/50">
                <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-stone-900">Action Center</h2>
                  <p className="text-xs text-stone-500">Pickups and drop-offs</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-stone-100 bg-white p-3 gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('alerts')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'alerts' ? 'bg-stone-900 text-white shadow-md shadow-stone-900/20' : 'text-stone-500 hover:bg-stone-100'}`}>Alerts</button>
                <button onClick={() => setActiveTab('farmers')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'farmers' ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'text-stone-500 hover:bg-stone-100'}`}>
                  Pickups
                </button>
                <button onClick={() => setActiveTab('buyers')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'buyers' ? 'bg-harvest-600 text-white shadow-md shadow-harvest-600/20' : 'text-stone-500 hover:bg-stone-100'}`}>
                  Drop-offs
                </button>
                <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'payments' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-stone-500 hover:bg-stone-100'}`}>
                  Payments
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-stone-50/30 p-2">
                {activeTab === 'alerts' && (
                  <div className="p-8 text-center text-stone-400 text-sm">No new system alerts.</div>
                )}

                {activeTab === 'farmers' && (
                  farmers.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-sm">No assigned pickups.</div>
                  ) : (
                    <div className="space-y-2">
                      {farmers.map(f => (
                        <div key={`farmer-${f.id}`} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                              <Sprout className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-stone-900 leading-snug">Pickup at <span className="font-bold">{f.name}'s Farm</span>.</p>
                              <p className="text-xs text-stone-500 mt-1 font-medium">Location: {f.location}</p>
                              <button onClick={() => { setSuccess(`Navigating to ${f.location}.`); }} className="mt-4 w-full py-2 rounded-lg bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors shadow-sm">
                                Start Navigation
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'buyers' && (
                  buyers.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-sm">No assigned drop-offs.</div>
                  ) : (
                    <div className="space-y-2">
                      {buyers.map(b => (
                        <div key={`buyer-${b.id}`} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-harvest-50 flex items-center justify-center flex-shrink-0">
                              <ShoppingCart className="w-5 h-5 text-harvest-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-stone-900 leading-snug">Drop-off for <span className="font-bold">{b.name}</span>.</p>
                              <p className="text-xs text-stone-500 mt-1 font-medium">Location: {b.location}</p>
                              <button onClick={() => { setSuccess(`Marked delivery complete for ${b.name}.`); }} className="mt-4 w-full py-2 rounded-lg bg-harvest-100 text-harvest-700 text-xs font-bold hover:bg-harvest-200 transition-colors">
                                Complete Delivery
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'payments' && (
                  <div className="space-y-4 p-2">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl text-white shadow-lg shadow-emerald-600/20">
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Freight Earnings</p>
                      <h3 className="font-display text-3xl font-bold">₹ 8,400</h3>
                      <button onClick={() => setSuccess('Earnings successfully withdrawn to bank account.')} className="mt-4 w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-bold transition-colors">
                        Withdraw Earnings
                      </button>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-stone-900">Recent Trips</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">All Paid</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm border-b border-stone-50 pb-2">
                          <span className="text-stone-600">Trip: Tumkur to Mysore</span>
                          <span className="font-bold text-stone-900">₹ 3,200</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-stone-50 pb-2">
                          <span className="text-stone-600">Trip: Kolar to Bangalore</span>
                          <span className="font-bold text-stone-900">₹ 5,200</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Update Location Modal */}
      {showLocationForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-bold text-stone-900">Update Location</h2>
              <button onClick={() => setShowLocationForm(false)} className="p-2 hover:bg-stone-100 rounded-xl transition-colors"><X className="w-5 h-5 text-stone-500" /></button>
            </div>
            <form onSubmit={handleUpdateLocation} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Current City/District</label>
                <input type="text" required value={locationForm.location} onChange={(e) => setLocationForm({location: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all font-medium" placeholder="e.g. Bangalore Highway" />
              </div>
              <button type="submit" className="w-full py-4 mt-4 rounded-xl bg-violet-600 text-white font-bold text-lg hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/30 hover:-translate-y-0.5">Sync Location</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
