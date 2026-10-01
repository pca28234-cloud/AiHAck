import React, { useEffect, useState } from 'react';
import { getVehicles, createVehicle } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Truck, X } from 'lucide-react';

export default function Transport() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    vehicle_number: '', capacity: '', available_capacity: '',
    availability_date: new Date().toISOString().split('T')[0], status: 'available',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getVehicles();
      setVehicles(res.data);
    } catch { setError('Failed to load vehicles.'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        capacity: parseFloat(form.capacity),
        available_capacity: parseFloat(form.available_capacity || form.capacity),
      };
      if (data.available_capacity > data.capacity) {
        setError('Available capacity cannot exceed total capacity.');
        return;
      }
      await createVehicle(data);
      setShowForm(false);
      setForm({ vehicle_number: '', capacity: '', available_capacity: '', availability_date: new Date().toISOString().split('T')[0], status: 'available' });
      setSuccess('Vehicle added successfully!');
      loadData();
    } catch (err) { setError(err.response?.data?.detail || 'Failed to add vehicle.'); }
  };

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  if (loading) return <LoadingSpinner message="Loading vehicles..." />;

  const totalCapacity = vehicles.reduce((sum, v) => sum + v.capacity, 0);
  const totalAvailable = vehicles.reduce((sum, v) => sum + v.available_capacity, 0);
  const utilization = totalCapacity > 0 ? ((totalCapacity - totalAvailable) / totalCapacity * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="transport-page">
      {success && <div className="mb-4 p-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm animate-slide-up">{success}</div>}
      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-slide-up">{error}</div>}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900">Transport</h1>
          <p className="text-stone-500 mt-1">Manage shared vehicle capacity.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors shadow-sm" id="btn-add-vehicle">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {/* Capacity Overview */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-card">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Total Capacity</p>
          <p className="text-2xl font-display font-bold text-stone-900">{totalCapacity}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-card">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Available</p>
          <p className="text-2xl font-display font-bold text-primary-700">{totalAvailable}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-card">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Utilization</p>
          <p className="text-2xl font-display font-bold text-harvest-700">{utilization.toFixed(1)}%</p>
          <div className="mt-2 w-full bg-stone-100 rounded-full h-2">
            <div className="bg-harvest-500 h-2 rounded-full transition-all" style={{ width: `${utilization}%` }} />
          </div>
        </div>
      </div>

      {/* Vehicle Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-stone-900">Add Vehicle</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Vehicle Number</label>
                <input type="text" required value={form.vehicle_number} onChange={(e) => setForm({...form, vehicle_number: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="e.g. KA-01-AB-1234" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Total Capacity</label>
                  <input type="number" step="0.1" min="1" required value={form.capacity} onChange={(e) => setForm({...form, capacity: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Available Capacity</label>
                  <input type="number" step="0.1" min="0" value={form.available_capacity} onChange={(e) => setForm({...form, available_capacity: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="Same as capacity" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Availability Date</label>
                <input type="date" required value={form.availability_date} onChange={(e) => setForm({...form, availability_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors">Add Vehicle</button>
            </form>
          </div>
        </div>
      )}

      {/* Vehicles List */}
      <div className="grid md:grid-cols-2 gap-4" id="vehicles-list">
        {vehicles.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 shadow-card">
            <Truck className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No vehicles registered. Add a vehicle to get started.</p>
          </div>
        ) : (
          vehicles.map((v) => {
            const used = v.capacity - v.available_capacity;
            const pct = v.capacity > 0 ? (used / v.capacity * 100) : 0;
            return (
              <div key={v.id} className="bg-white rounded-xl border border-stone-200 p-6 shadow-card hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-stone-900">{v.vehicle_number}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Available: {v.availability_date}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    v.status === 'available' ? 'bg-primary-50 text-primary-700' :
                    v.status === 'in_use' ? 'bg-harvest-50 text-harvest-700' :
                    'bg-stone-100 text-stone-600'
                  }`}>{v.status}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Capacity</span>
                    <span className="font-medium text-stone-900">{v.capacity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Available</span>
                    <span className="font-medium text-primary-700">{v.available_capacity}</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2.5 mt-2">
                    <div className={`h-2.5 rounded-full transition-all ${pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-harvest-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-stone-400 text-right">{pct.toFixed(0)}% utilized</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
