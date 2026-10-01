import React, { useEffect, useState, useCallback } from 'react';
import { getTransporterJobs, updateTransportStatus, getVehicles } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Truck, Check, MapPin, Activity, User, Phone, Shield,
  Bot, RefreshCw, ChevronRight, LogOut, AlertTriangle,
  Clock, Package, CheckCircle2, ArrowRight, Loader2
} from 'lucide-react';

export default function TransporterDashboard() {
  const [jobs, setJobs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'fleet'
  const [selectedJob, setSelectedJob] = useState(null);

  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobsRes, vRes] = await Promise.allSettled([
        getTransporterJobs(),
        getVehicles(),
      ]);

      if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
        setJobs(jobsRes.value.data);
      }
      if (vRes.status === 'fulfilled' && vRes.value.data) {
        setVehicles(vRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load transporter data:', err);
      setError('Failed to load transporter data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time WebSocket connection for transporter
  const handleWsEvent = useCallback((event, data) => {
    console.log('[WS Transporter]', event, data);
    if (event === 'transport_allocated') {
      setSuccess(`🚛 New Transport Job Assigned! Order #${data.order_id}`);
      loadData();
    } else if (event === 'truck_status_updated' || event === 'order_status_updated') {
      setSuccess(`Status updated: ${data.display_status || data.status}`);
      loadData();
    }
  }, [loadData]);

  useWebSocket('transporter', handleWsEvent);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateTransportStatus(orderId, newStatus);
      setSuccess(`Status changed to ${newStatus.toUpperCase()}`);
      await loadData();
    } catch (err) {
      console.error('Update status error:', err);
      setError(err.response?.data?.detail || 'Failed to update transport status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const statusBadge = (st) => {
    const s = (st || '').toLowerCase().replace(/_/g, ' ');
    if (s.includes('delivered')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s.includes('transit')) return 'bg-violet-100 text-violet-800 border-violet-200';
    if (s.includes('pickup') || s.includes('picked')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-sky-100 text-sky-800 border-sky-200';
  };

  if (loading && jobs.length === 0) {
    return <LoadingSpinner message="Loading Transporter Fleet & Jobs..." />;
  }

  const activeJobs = jobs.filter(j => j.status !== 'delivered');
  const deliveredJobs = jobs.filter(j => j.status === 'delivered');

  return (
    <div className="min-h-screen bg-surface-50 font-sans pb-16" id="transporter-dashboard">
      {/* Topbar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20 text-white">
              <Truck className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl text-stone-900 tracking-tight">
              Harvest<span className="text-violet-600">Link</span> AI
            </span>
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-100 text-violet-800 border border-violet-200">
              Transporter
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-stone-900">Raj Transport Services</p>
              <p className="text-xs text-stone-500 font-mono">Username: transporter1</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-rose-500 transition-colors ml-2"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {/* Toast alerts */}
        {success && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 shadow-sm animate-slide-up">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3 shadow-sm animate-slide-up">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hero banner */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-800 rounded-3xl p-7 mb-8 text-white shadow-xl relative overflow-hidden border border-stone-800">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Truck className="w-64 h-64 text-white" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Fleet Command
                </span>
                <span className="text-xs font-mono text-stone-400">Hub: Karnataka Corridor</span>
              </div>
              <h1 className="font-display text-3xl font-bold text-white tracking-tight">
                Raj Transport Services
              </h1>
              <p className="text-stone-300 text-sm mt-1">
                Real-Time Transport Execution & Driver Coordination
              </p>

              <div className="flex flex-wrap gap-4 mt-4 text-xs text-stone-300 border-t border-white/10 pt-3">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-400" /> Fleet Manager: Rajesh Singh
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-violet-400" /> +91 9822098765
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-violet-400" /> Verified Carrier #KA-TR-4029
                </span>
              </div>
            </div>

            <button
              onClick={loadData}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/15"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Status
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 border-t border-white/10 pt-4">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="font-bold text-2xl text-violet-400">{jobs.length}</p>
              <p className="text-white text-xs font-semibold mt-0.5">Assigned Orders</p>
              <p className="text-stone-400 text-[11px]">Total logistics jobs</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="font-bold text-2xl text-amber-400">{activeJobs.length}</p>
              <p className="text-white text-xs font-semibold mt-0.5">Active In-Transit</p>
              <p className="text-stone-400 text-[11px]">En route or pickup</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="font-bold text-2xl text-emerald-400">{deliveredJobs.length}</p>
              <p className="text-white text-xs font-semibold mt-0.5">Completed</p>
              <p className="text-stone-400 text-[11px]">Delivered to buyers</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="font-bold text-2xl text-sky-400">{vehicles.length}</p>
              <p className="text-white text-xs font-semibold mt-0.5">Fleet Vehicles</p>
              <p className="text-stone-400 text-[11px]">T1, T2, T3, T4 Active</p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 border-b border-stone-200 mb-6">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'jobs'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Truck className="w-4 h-4" /> Assigned Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'fleet'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Shield className="w-4 h-4" /> Fleet Status ({vehicles.length})
          </button>
        </div>

        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <h3 className="font-bold text-stone-700 text-base mb-1">No Transport Jobs Yet</h3>
                <p className="text-sm">
                  When a farmer accepts a buyer request, the AI Transport Agent will allocate trucks and display the job here in real time.
                </p>
              </div>
            ) : (
              jobs.map((job) => {
                const isDelivered = job.status === 'delivered';
                const currentStatus = (job.status || 'transport_allocated').replace(/_/g, ' ').toUpperCase();

                return (
                  <div
                    key={job.order_id}
                    className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-md transition-all"
                  >
                    {/* Header */}
                    <div className="p-6 bg-stone-50/60 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono font-bold text-lg text-stone-900">
                            ORDER #{job.order_code || `ORD${job.order_id}`}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge(
                              job.status
                            )}`}
                          >
                            {currentStatus}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          {job.crop} • {job.quantity} • Grade {job.quality_grade} • Transport Fee: <strong>₹{job.total_cost?.toLocaleString()}</strong>
                        </p>
                      </div>

                      {/* Transporter Status Updater Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
                          Update Status:
                        </span>
                        {['ASSIGNED', 'PICKUP STARTED', 'PICKED UP', 'IN TRANSIT', 'DELIVERED'].map((st) => {
                          const isActive = currentStatus === st;
                          return (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(job.order_id, st)}
                              disabled={updatingOrderId === job.order_id || isActive}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                isActive
                                  ? 'bg-violet-600 text-white shadow-sm ring-2 ring-violet-200'
                                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                              } disabled:opacity-50`}
                            >
                              {updatingOrderId === job.order_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isActive ? (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              ) : null}
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Job Details Grid */}
                    <div className="p-6 grid md:grid-cols-3 gap-6">
                      {/* Farmer / Pickup */}
                      <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                        <div className="flex items-center gap-2 text-primary-700 font-bold text-xs uppercase tracking-wider mb-2">
                          <MapPin className="w-4 h-4 text-primary-600" />
                          Pickup Details (Farmer)
                        </div>
                        <p className="font-bold text-stone-900 text-sm">{job.farmer?.name}</p>
                        <p className="text-xs text-stone-600 mt-0.5">{job.farmer?.farm_name}</p>
                        <p className="text-xs text-stone-500 mt-1 font-medium">{job.farmer?.pickup_location}</p>
                        <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> +91 {job.farmer?.phone}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-2">
                          Scheduled Pickup: <strong>{job.pickup_time || 'Today 08:00 AM'}</strong>
                        </p>
                      </div>

                      {/* Buyer / Delivery */}
                      <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                        <div className="flex items-center gap-2 text-harvest-700 font-bold text-xs uppercase tracking-wider mb-2">
                          <Package className="w-4 h-4 text-harvest-600" />
                          Delivery Details (Buyer)
                        </div>
                        <p className="font-bold text-stone-900 text-sm">{job.buyer?.name}</p>
                        <p className="text-xs text-stone-500 mt-1 font-medium">{job.buyer?.delivery_location}</p>
                        <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> +91 {job.buyer?.phone}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-2">
                          Target Delivery: <strong>{job.delivery_time || 'Same Day'}</strong>
                        </p>
                      </div>

                      {/* Assigned Trucks */}
                      <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                        <div className="flex items-center gap-2 text-violet-800 font-bold text-xs uppercase tracking-wider mb-2">
                          <Truck className="w-4 h-4 text-violet-600" />
                          Assigned Fleet ({job.assigned_trucks?.length || 0} Trucks)
                        </div>
                        <div className="space-y-2 mt-2">
                          {(job.assigned_trucks || []).map((t, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded-lg p-2.5 border border-violet-100 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-mono font-bold text-stone-900">{t.truck_number}</span>
                                <p className="text-[11px] text-stone-500 mt-0.5">
                                  Driver: <strong>{t.driver_name}</strong> ({t.driver_contact})
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-violet-700">{t.assigned_capacity}</span>
                                <p className="text-[11px] text-stone-500 font-mono">₹{t.cost}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {vehicles.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                    🚛
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      v.status === 'available'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-violet-100 text-violet-700'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
                <h3 className="font-mono font-bold text-stone-900 text-base">{v.vehicle_number}</h3>
                <p className="text-xs text-stone-500 mt-0.5">Driver: {v.driver_name}</p>
                <p className="text-xs text-stone-500">📞 +91 {v.driver_contact}</p>

                <div className="mt-4 pt-3 border-t border-stone-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Total Capacity:</span>
                    <span className="font-bold text-stone-800">{v.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Available:</span>
                    <span className="font-bold text-emerald-600">{v.available_capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Trip Cost:</span>
                    <span className="font-bold text-stone-800">₹{v.cost_per_trip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Location:</span>
                    <span className="font-medium text-stone-700">{v.current_location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
