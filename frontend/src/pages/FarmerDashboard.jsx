import React, { useEffect, useState } from 'react';
import { getFarmers, getHarvests, createHarvest, getOrders, getVehicles } from '../services/api';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { Sprout, Plus, Check, Truck, ShoppingCart, X, AlertTriangle, LogOut, History, MapPin, Ruler, Activity, Wallet } from 'lucide-react';

export default function FarmerDashboard() {
  const [farmer, setFarmer] = useState(null);
  const [harvests, setHarvests] = useState([]);
  const [buyerRequests, setBuyerRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('buyers');
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [harvestForm, setHarvestForm] = useState({
    estimated_quantity: '', quality_grade: 'A', harvest_date: new Date().toISOString().split('T')[0]
  });
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fRes, hRes, oRes, vRes] = await Promise.all([
        getFarmers(), getHarvests(), getOrders(), getVehicles()
      ]);
      
      if (fRes.data.length > 0) {
        const currentFarmer = fRes.data[0];
        setFarmer(currentFarmer);
        const farmerHarvests = hRes.data.filter(h => h.farmer_id === currentFarmer.id)
          .sort((a, b) => new Date(b.harvest_date) - new Date(a.harvest_date));
        setHarvests(farmerHarvests);
      }
      setBuyerRequests(oRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHarvest = async (e) => {
    e.preventDefault();
    if (!farmer) return;
    try {
      await createHarvest({
        farmer_id: farmer.id,
        crop: 'Tomato',
        estimated_quantity: parseFloat(harvestForm.estimated_quantity),
        quality_grade: harvestForm.quality_grade,
        harvest_date: harvestForm.harvest_date,
        status: 'estimated'
      });
      setShowHarvestForm(false);
      setHarvestForm({ estimated_quantity: '', quality_grade: 'A', harvest_date: new Date().toISOString().split('T')[0] });
      setSuccess('Harvest logged successfully!');
      loadData();
    } catch (err) {
      setError('Failed to log harvest.');
    }
  };

  const handleAcceptRequest = (buyerName) => {
    setSuccess(`Accepted request from ${buyerName}! Transporter will be arranged.`);
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
  if (!farmer && !loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center text-stone-500">
      <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
      No farmer profile found.
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-50 font-sans pb-12" id="farmer-dashboard">
      
      {/* Farmer Specific Topbar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-stone-900 tracking-tight">
              Harvest<span className="text-primary-500">Link</span> AI
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Profile Menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-stone-900">{farmer.name}</p>
                <p className="text-xs text-stone-500">Farmer</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center border-2 border-primary-50">
                <span className="font-display font-bold text-primary-700">{farmer.name.charAt(0)}</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-rose-500 transition-colors ml-2" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {success && <div className="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-200 text-primary-800 text-sm animate-slide-up shadow-sm flex items-center gap-3"><Check className="w-5 h-5 text-primary-500" /> {success}</div>}
        {error && <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-slide-up shadow-sm flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-500" /> {error}</div>}

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Sprout className="w-64 h-64 text-white transform rotate-12 translate-x-12 -translate-y-12" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-stone-400 font-medium mb-1">Welcome back,</p>
              <h1 className="font-display text-4xl font-bold text-white tracking-tight">{farmer.name}</h1>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-stone-300">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary-400" /> {farmer.location}</span>
                <span className="flex items-center gap-1.5"><Ruler className="w-4 h-4 text-primary-400" /> {farmer.farm_size} hectares</span>
              </div>
            </div>
            <button onClick={() => setShowHarvestForm(true)} className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary-500 text-white font-bold hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-1">
              <Plus className="w-6 h-6" /> Log New Harvest
            </button>
          </div>
        </div>

        {/* 2-Column Dashboard Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Harvest History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden h-full">
              <div className="px-8 py-6 border-b border-stone-100 flex items-center gap-3 bg-stone-50/50">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <History className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-stone-900">Harvest History</h2>
                  <p className="text-sm text-stone-500">Your past and present harvest records</p>
                </div>
              </div>
              
              {harvests.length === 0 ? (
                <div className="p-16 text-center text-stone-400">
                  <Sprout className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">You haven't logged any harvests yet.</p>
                  <button onClick={() => setShowHarvestForm(true)} className="mt-4 text-primary-600 font-medium hover:underline">Log your first harvest</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-stone-50/80 text-stone-500 font-semibold uppercase tracking-wider text-xs border-b border-stone-100">
                        <th className="px-8 py-4">Date</th>
                        <th className="px-8 py-4 text-right">Quantity</th>
                        <th className="px-8 py-4 text-center">Quality</th>
                        <th className="px-8 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {harvests.map((h, i) => (
                        <tr key={h.id} className="hover:bg-stone-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <span className={`font-semibold ${i === 0 ? 'text-stone-900' : 'text-stone-600'}`}>{h.harvest_date}</span>
                            {i === 0 && <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-700">Latest</span>}
                          </td>
                          <td className="px-8 py-5 text-right font-display font-bold text-stone-900 text-base">
                            {h.estimated_quantity} <span className="text-xs font-sans text-stone-500 font-normal">kg</span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm font-bold shadow-sm ${
                              h.quality_grade === 'A' ? 'bg-primary-50 text-primary-700 border border-primary-100' :
                              h.quality_grade === 'B' ? 'bg-harvest-50 text-harvest-700 border border-harvest-100' :
                              'bg-stone-100 text-stone-700 border border-stone-200'
                            }`}>
                              {h.quality_grade}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                              h.status === 'sorted' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                              h.status === 'allocated' ? 'bg-primary-50 text-primary-700 border border-primary-100' :
                              'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}>
                              {h.status}
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

          {/* Right Column: Action Center (Replaces Bell Icon) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden h-full flex flex-col">
              <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3 bg-stone-50/50">
                <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-stone-900">Action Center</h2>
                  <p className="text-xs text-stone-500">Manage incoming requests</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-stone-100 bg-white p-3 gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('alerts')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'alerts' ? 'bg-stone-900 text-white shadow-md shadow-stone-900/20' : 'text-stone-500 hover:bg-stone-100'}`}>Alerts</button>
                <button onClick={() => setActiveTab('buyers')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'buyers' ? 'bg-harvest-600 text-white shadow-md shadow-harvest-600/20' : 'text-stone-500 hover:bg-stone-100'}`}>
                  Buyers {buyerRequests.length > 0 && <span className="ml-1 opacity-90">({buyerRequests.length})</span>}
                </button>
                <button onClick={() => setActiveTab('transport')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'transport' ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20' : 'text-stone-500 hover:bg-stone-100'}`}>
                  Transport {vehicles.length > 0 && <span className="ml-1 opacity-90">({vehicles.length})</span>}
                </button>
                <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'payments' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-stone-500 hover:bg-stone-100'}`}>
                  Payments
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-stone-50/30 p-2">
                {activeTab === 'alerts' && (
                  <div className="p-8 text-center text-stone-400 text-sm">No new system alerts.</div>
                )}

                {activeTab === 'buyers' && (
                  buyerRequests.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-sm">No new buyer requests.</div>
                  ) : (
                    <div className="space-y-2">
                      {buyerRequests.map(r => (
                        <div key={`buyer-${r.id}`} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-harvest-50 flex items-center justify-center flex-shrink-0">
                              <ShoppingCart className="w-5 h-5 text-harvest-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-stone-900 leading-snug"><span className="font-bold">{r.buyer_name}</span> is requesting <span className="font-bold text-harvest-600">{r.quantity} kg</span> of Grade {r.quality_grade} tomatoes.</p>
                              <p className="text-xs text-stone-500 mt-1 font-medium">Needed by: {r.delivery_date}</p>
                              <div className="flex gap-2 mt-4">
                                <button onClick={() => handleAcceptRequest(r.buyer_name)} className="flex-1 py-2 rounded-lg bg-harvest-600 text-white text-xs font-bold hover:bg-harvest-700 transition-colors shadow-sm">
                                  Accept
                                </button>
                                <button className="flex-1 py-2 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition-colors">
                                  Decline
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'transport' && (
                  vehicles.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-sm">No vehicle assignments yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {vehicles.map(v => (
                        <div key={`veh-${v.id}`} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                              <Truck className="w-5 h-5 text-violet-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-stone-900 leading-snug">Transporter <span className="font-bold">{v.vehicle_number}</span> is assigned for pickup.</p>
                              <p className="text-xs text-stone-500 mt-1 font-medium">Available Capacity: {v.available_capacity} kg</p>
                              <button onClick={() => { setSuccess('Confirmed pickup details with transporter.'); }} className="mt-4 w-full py-2 rounded-lg bg-violet-100 text-violet-700 text-xs font-bold hover:bg-violet-200 transition-colors">
                                View Details
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
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Total Earnings</p>
                      <h3 className="font-display text-3xl font-bold">₹ 42,500</h3>
                      <button onClick={() => setSuccess('Withdrawal initiated! Funds will arrive in 24 hours.')} className="mt-4 w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-bold transition-colors">
                        Withdraw Funds
                      </button>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-stone-900">Pending Payments</span>
                        <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">2 Invoices</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm border-b border-stone-50 pb-2">
                          <span className="text-stone-600">Restaurant Group Order</span>
                          <span className="font-bold text-stone-900">₹ 15,000</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-stone-600">Market Buyer Order</span>
                          <span className="font-bold text-stone-900">₹ 8,500</span>
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

      {/* Make Harvest Modal */}
      {showHarvestForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-bold text-stone-900">Log New Harvest</h2>
              <button onClick={() => setShowHarvestForm(false)} className="p-2 hover:bg-stone-100 rounded-xl transition-colors"><X className="w-5 h-5 text-stone-500" /></button>
            </div>
            <form onSubmit={handleCreateHarvest} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Estimated Quantity (kg)</label>
                <input type="number" step="0.1" min="1" required value={harvestForm.estimated_quantity} onChange={(e) => setHarvestForm({...harvestForm, estimated_quantity: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all font-medium" placeholder="e.g. 500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Quality Grade</label>
                  <select value={harvestForm.quality_grade} onChange={(e) => setHarvestForm({...harvestForm, quality_grade: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all font-medium">
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Harvest Date</label>
                  <input type="date" required value={harvestForm.harvest_date} onChange={(e) => setHarvestForm({...harvestForm, harvest_date: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all font-medium" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 mt-4 rounded-xl bg-primary-600 text-white font-bold text-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30 hover:-translate-y-0.5">Submit Harvest</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
