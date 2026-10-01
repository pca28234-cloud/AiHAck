import React, { useEffect, useState } from 'react';
import { getFarmers, getHarvests, createHarvest, getOrders, getVehicles } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Sprout, MapPin, Ruler, Plus, Check, Truck, ShoppingCart, X, AlertTriangle } from 'lucide-react';

export default function FarmerDashboard() {
  const [farmer, setFarmer] = useState(null);
  const [harvests, setHarvests] = useState([]);
  const [buyerRequests, setBuyerRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [harvestForm, setHarvestForm] = useState({
    estimated_quantity: '', quality_grade: 'A', harvest_date: new Date().toISOString().split('T')[0]
  });
  const [success, setSuccess] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fRes, hRes, oRes, vRes] = await Promise.all([
        getFarmers(), getHarvests(), getOrders(), getVehicles()
      ]);
      
      // Assume the logged-in farmer is the first one for demo purposes
      if (fRes.data.length > 0) {
        const currentFarmer = fRes.data[0];
        setFarmer(currentFarmer);
        setHarvests(hRes.data.filter(h => h.farmer_id === currentFarmer.id));
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
      setSuccess('Harvest added successfully!');
      loadData();
    } catch (err) {
      setError('Failed to add harvest.');
    }
  };

  const handleAcceptRequest = (buyerName) => {
    setSuccess(`Accepted request from ${buyerName}! The AI Coordinator has been notified.`);
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
      No farmer profile found. Please register an admin first.
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="farmer-dashboard">
      {success && <div className="mb-4 p-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm animate-slide-up">{success}</div>}
      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-slide-up">{error}</div>}

      {/* Header & Profile */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center border-4 border-primary-50">
            <span className="font-display text-2xl font-bold text-primary-700">{farmer.name.charAt(0)}</span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-900">Welcome, {farmer.name}</h1>
            <div className="flex gap-4 mt-2 text-sm text-stone-500">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {farmer.location}</span>
              <span className="flex items-center gap-1"><Ruler className="w-4 h-4" /> {farmer.farm_size} ha</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${farmer.producer_type === 'small' ? 'bg-primary-50 text-primary-700' : 'bg-harvest-50 text-harvest-700'}`}>
                {farmer.producer_type.charAt(0).toUpperCase() + farmer.producer_type.slice(1)} Producer
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowHarvestForm(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5">
          <Plus className="w-5 h-5" /> Make Harvest
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column (Harvests & Vehicles) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* My Harvests */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2 bg-gradient-to-r from-primary-50/50 to-transparent">
              <Sprout className="w-5 h-5 text-primary-600" />
              <h2 className="font-display font-semibold text-stone-900">My Harvests</h2>
            </div>
            {harvests.length === 0 ? (
              <div className="p-8 text-center text-stone-400">You haven't recorded any harvests yet.</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {harvests.map(h => (
                  <div key={h.id} className="p-4 px-6 flex items-center justify-between hover:bg-stone-50/50">
                    <div>
                      <p className="font-semibold text-stone-900">{h.estimated_quantity} kg <span className="text-stone-500 font-normal ml-1">({h.crop})</span></p>
                      <p className="text-xs text-stone-500 mt-1">Date: {h.harvest_date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${h.quality_grade === 'A' ? 'bg-primary-50 text-primary-700' : 'bg-harvest-50 text-harvest-700'}`}>
                        Grade {h.quality_grade}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transport Assigned */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2 bg-gradient-to-r from-violet-50/50 to-transparent">
              <Truck className="w-5 h-5 text-violet-600" />
              <h2 className="font-display font-semibold text-stone-900">Assigned Transportation</h2>
            </div>
            {vehicles.length === 0 ? (
              <div className="p-8 text-center text-stone-400">No vehicles are currently assigned to your location.</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 p-6">
                {vehicles.map(v => (
                  <div key={v.id} className="border border-stone-200 rounded-xl p-4 flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{v.vehicle_number}</p>
                      <p className="text-sm text-stone-500 mt-0.5">Avail: {v.available_capacity} kg</p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">Scheduled</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (Buyer Requests) */}
        <div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-card overflow-hidden sticky top-8">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2 bg-gradient-to-r from-harvest-50/50 to-transparent">
              <ShoppingCart className="w-5 h-5 text-harvest-600" />
              <h2 className="font-display font-semibold text-stone-900">Buyer Requests</h2>
            </div>
            <div className="p-4 bg-harvest-50/30 text-xs text-stone-500 border-b border-stone-100">
              Review and approve matching demands from buyers.
            </div>
            <div className="divide-y divide-stone-100 max-h-[600px] overflow-y-auto">
              {buyerRequests.length === 0 ? (
                <div className="p-8 text-center text-stone-400">No active buyer requests.</div>
              ) : (
                buyerRequests.map(r => (
                  <div key={r.id} className="p-5 hover:bg-stone-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-stone-900">{r.buyer_name}</h3>
                      <span className="font-display font-bold text-harvest-600">{r.quantity} kg</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4 text-xs">
                      <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-600">Grade {r.quality_grade}</span>
                      <span className="text-stone-400">By {r.delivery_date}</span>
                    </div>
                    <button 
                      onClick={() => handleAcceptRequest(r.buyer_name)}
                      className="w-full py-2 rounded-lg bg-harvest-100 text-harvest-700 font-medium text-sm hover:bg-harvest-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Accept Request
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Make Harvest Modal */}
      {showHarvestForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-stone-900">Log New Harvest</h2>
              <button onClick={() => setShowHarvestForm(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateHarvest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Estimated Qty (kg)</label>
                <input type="number" step="0.1" min="1" required value={harvestForm.estimated_quantity} onChange={(e) => setHarvestForm({...harvestForm, estimated_quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Quality Grade</label>
                <select value={harvestForm.quality_grade} onChange={(e) => setHarvestForm({...harvestForm, quality_grade: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Harvest Date</label>
                <input type="date" required value={harvestForm.harvest_date} onChange={(e) => setHarvestForm({...harvestForm, harvest_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <button type="submit" className="w-full py-2.5 mt-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors">Submit Harvest</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
