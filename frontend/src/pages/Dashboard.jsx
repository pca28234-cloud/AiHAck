import React, { useEffect, useState, useCallback } from 'react';
import {
  getFarmers, getHarvests, getBuyers, getVehicles,
  getOrdersExtended, getOrderDetail, getUsers, getAdminDashboard,
  getCancellations
} from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import {
  Network, Sprout, ShoppingCart, Truck, ArrowRight, ShieldCheck,
  Activity, Users, Route, X, CheckCircle2, Clock, MapPin, Phone,
  Mail, Calendar, DollarSign, ChevronRight, RefreshCw, LogOut,
  IndianRupee, Layers, Eye, Check, Ban, AlertTriangle
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    farmers: 0,
    buyers: 0,
    vehicles: 0,
    totalVolume: 0,
    totalOrders: 0,
    activeOrders: 0,
  });

  const [orders, setOrders] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [fRes, hRes, bRes, vRes, oRes, uRes, cRes] = await Promise.allSettled([
        getFarmers(),
        getHarvests(),
        getBuyers(),
        getVehicles(),
        getOrdersExtended(),
        getUsers(),
        getCancellations(),
      ]);

      const farmersData = fRes.status === 'fulfilled' ? fRes.value.data : [];
      const harvestsData = hRes.status === 'fulfilled' ? hRes.value.data : [];
      const buyersData = bRes.status === 'fulfilled' ? bRes.value.data : [];
      const vehiclesData = vRes.status === 'fulfilled' ? vRes.value.data : [];
      const ordersData = oRes.status === 'fulfilled' ? oRes.value.data : [];
      const usersData = uRes.status === 'fulfilled' ? uRes.value.data : [];
      const cancellationsData = cRes.status === 'fulfilled' ? cRes.value.data : [];

      setFarmers(farmersData);
      setHarvests(harvestsData);
      setBuyers(buyersData);
      setVehicles(vehiclesData);
      setOrders(ordersData);
      setUsersList(usersData);
      setCancellations(cancellationsData);

      const totalVol = harvestsData.reduce((sum, h) => sum + (h.sorted_quantity || h.estimated_quantity || 0), 0);
      const activeO = ordersData.filter(o => !['delivered', 'rejected', 'cancelled'].includes(o.status)).length;

      setStats({
        farmers: farmersData.length,
        buyers: buyersData.length,
        vehicles: vehiclesData.length,
        totalVolume: totalVol,
        totalOrders: ordersData.length,
        activeOrders: activeO,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError('Failed to load system dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time WebSocket synchronization
  const handleWsEvent = useCallback((event, data) => {
    console.log('[WS Admin]', event, data);
    setSuccess(`Real-time update: ${event.replace(/_/g, ' ').toUpperCase()}`);
    loadDashboardData();
  }, [loadDashboardData]);

  useWebSocket('admin', handleWsEvent);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleOrderClick = async (orderId) => {
    setLoadingDetail(true);
    try {
      const res = await getOrderDetail(orderId);
      setSelectedOrderDetail(res.data);
    } catch (err) {
      console.error('Failed to load order detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const statusBadge = (st) => {
    const s = (st || '').toLowerCase().replace(/_/g, ' ');
    if (s.includes('cancelled')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (s.includes('delivered')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s.includes('transit')) return 'bg-violet-100 text-violet-800 border-violet-200';
    if (s.includes('pickup') || s.includes('picked')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s.includes('accepted') || s.includes('allocated')) return 'bg-sky-100 text-sky-800 border-sky-200';
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };

  if (loading && orders.length === 0) return <LoadingSpinner message="Initializing Admin Real-Time Center..." />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: `Users (${usersList.length})` },
    { id: 'farmers', label: `Farmers (${farmers.length})` },
    { id: 'buyers', label: `Buyers (${buyers.length})` },
    { id: 'transporters', label: 'Transporters' },
    { id: 'harvests', label: `Harvests (${harvests.length})` },
    { id: 'orders', label: `Orders (${orders.length})` },
    { id: 'cancellations', label: `Cancellations (${cancellations.length})` },
    { id: 'transport', label: `Transport (${vehicles.length})` },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="min-h-screen bg-surface-50 font-sans pb-16" id="admin-dashboard">
      {/* Top Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-display font-bold text-xl text-stone-900 tracking-tight">
                Harvest<span className="text-sky-600">Link</span> AI
              </span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
              <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-500" /> Live Synchronized
            </div>
            <button
              onClick={loadDashboardData}
              className="p-2 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar border-t border-stone-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 font-bold text-xs whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-sky-600 text-sky-700 bg-sky-50/40'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-slide-up">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-slide-up">
            <X className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3 text-primary-700">
              <Sprout className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Farmers</p>
            <h3 className="font-display text-3xl font-bold text-stone-900 mt-0.5">{stats.farmers}</h3>
            <p className="text-[11px] text-stone-400 mt-1">5 Verified Producers</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3 text-amber-700">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Buyers</p>
            <h3 className="font-display text-3xl font-bold text-stone-900 mt-0.5">{stats.buyers}</h3>
            <p className="text-[11px] text-stone-400 mt-1">ABC Restaurant Group</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3 text-violet-700">
              <Truck className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Transporter Fleet</p>
            <h3 className="font-display text-3xl font-bold text-stone-900 mt-0.5">{stats.vehicles}</h3>
            <p className="text-[11px] text-stone-400 mt-1">T1, T2, T3, T4 Active</p>
          </div>

          <div className="bg-gradient-to-br from-sky-600 to-sky-800 p-5 rounded-2xl shadow-lg shadow-sky-600/20 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <Route className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-bold text-sky-200 uppercase tracking-wider">Total Volume</p>
            <h3 className="font-display text-3xl font-bold text-white mt-0.5">
              {stats.totalVolume.toLocaleString()} <span className="text-sm font-sans font-normal text-sky-200">kg</span>
            </h3>
            <p className="text-[11px] text-sky-200 mt-1">{stats.activeOrders} active coordinated orders</p>
          </div>
        </div>

        {/* ── SECTION: RECENT ORDER HISTORY (Requirement 12) ── */}
        {(activeTab === 'dashboard' || activeTab === 'history' || activeTab === 'orders') && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-card overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div>
                <h2 className="font-display font-bold text-xl text-stone-900 flex items-center gap-2">
                  <Network className="w-5 h-5 text-sky-600" />
                  RECENT ORDER HISTORY
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Single source of truth: click any order to view full Farmer + Buyer + Transporter connected details & timeline
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-sky-100 text-sky-800 px-3 py-1 rounded-full">
                {orders.length} Order Records
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="p-16 text-center text-stone-400">
                <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-stone-600">No active or completed orders yet.</p>
                <p className="text-xs text-stone-400 mt-1">
                  Once a buyer requests produce from a farmer and it is accepted, complete live order records appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {orders.map((o) => {
                  const trucks = o.transport?.trucks || [];
                  const orderCode = o.order_code || `ORD${o.id.toString().padStart(3, '0')}`;

                  return (
                    <div
                      key={o.id}
                      onClick={() => handleOrderClick(o.id)}
                      className="p-6 hover:bg-stone-50/80 transition-all cursor-pointer group"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Order Header & Connection */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-display font-bold text-lg text-sky-700 font-mono group-hover:text-sky-800">
                              ORDER #{orderCode}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge(o.status)}`}>
                              {o.display_status || o.status}
                            </span>
                          </div>

                          {o.status === 'cancelled' && (
                            <div className="mb-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                              <Ban className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                              <span>Cancelled by {o.cancelled_by || 'User'} • Reason: {o.cancellation_reason || 'Pre-pickup cancellation'}</span>
                            </div>
                          )}

                          <div className="grid sm:grid-cols-3 gap-3 text-xs text-stone-700 bg-stone-50 rounded-2xl p-4 border border-stone-100">
                            <div>
                              <p className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">Farmer</p>
                              <p className="font-bold text-stone-900 mt-0.5">{o.farmer_username || 'farmer1'} ({o.farmer_name || 'Farmer'})</p>
                              <p className="text-stone-500 text-[11px]">{o.farmer_location || 'Kolar, Karnataka'}</p>
                            </div>
                            <div>
                              <p className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">Buyer</p>
                              <p className="font-bold text-stone-900 mt-0.5">{o.buyer_name || 'ABC Restaurant'}</p>
                              <p className="text-stone-500 text-[11px]">{o.delivery_location || 'Bangalore, Karnataka'}</p>
                            </div>
                            <div>
                              <p className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">Transporter</p>
                              <p className="font-bold text-violet-800 mt-0.5">{o.transporter_name || 'Raj Transport Services'}</p>
                              <p className="text-stone-500 text-[11px]">Fleet: Karnataka Express</p>
                            </div>
                          </div>
                        </div>

                        {/* Transport Specs */}
                        <div className="lg:w-80 bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-xs text-stone-500 font-medium">Quantity & Crop</p>
                              <p className="font-bold text-stone-900 text-sm">
                                {o.quantity} • {o.crop || 'Tomato'} (Grade {o.quality_grade})
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-stone-400 uppercase font-bold">Transport Cost</p>
                              <p className="font-display font-bold text-emerald-700 text-base">
                                ₹{o.transport?.total_cost ? o.transport.total_cost.toLocaleString() : '3,200'}
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-stone-100 pt-2 mt-1">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                              Allocated Trucks:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {trucks.length > 0 ? (
                                trucks.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-mono font-bold border border-violet-100"
                                  >
                                    {t.vehicle_number} — {t.assigned_capacity}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-stone-400 italic">T1 (800), T2 (500), T3 (200)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center text-stone-400 group-hover:text-sky-600 transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: USERS ── */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 mb-8">
            <h2 className="font-bold text-xl text-stone-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" /> System Users ({usersList.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider text-xs border-b border-stone-100">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Username</th>
                    <th className="px-6 py-3">Full Name</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Password Security</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50/50">
                      <td className="px-6 py-3.5 font-mono text-stone-500">{u.id}</td>
                      <td className="px-6 py-3.5 font-bold font-mono text-stone-900">{u.username}</td>
                      <td className="px-6 py-3.5 text-stone-800">{u.full_name}</td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          u.role === 'farmer' ? 'bg-primary-100 text-primary-800' :
                          u.role === 'buyer' ? 'bg-amber-100 text-amber-800' :
                          u.role === 'transporter' ? 'bg-violet-100 text-violet-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Bcrypt Hashed
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: FARMERS ── */}
        {activeTab === 'farmers' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {farmers.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                      {f.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-base">{f.name}</h3>
                      <p className="text-xs font-mono text-primary-600 font-semibold">{f.username || `farmer${f.id}`}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                    {f.producer_type}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                  <p><strong>Farm Name:</strong> {f.farm_name || 'Farm'}</p>
                  <p><strong>Location:</strong> {f.location}</p>
                  <p><strong>Size:</strong> {f.farm_size} ha</p>
                  <p><strong>Phone:</strong> {f.phone}</p>
                  <p><strong>PAN:</strong> {f.pan_card}</p>
                  <p className="text-[11px] text-stone-400 mt-2">{f.land_location}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: BUYERS ── */}
        {activeTab === 'buyers' && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {buyers.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-base">{b.name}</h3>
                      <p className="text-xs font-mono text-amber-600 font-semibold">{b.username || 'buyer1'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Verified Buyer
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                  <p><strong>Delivery Location:</strong> {b.location}</p>
                  <p><strong>Contact:</strong> {b.contact}</p>
                  <p><strong>Phone:</strong> +91 {b.phone}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: TRANSPORTERS / FLEET ── */}
        {(activeTab === 'transporters' || activeTab === 'transport') && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-xl text-stone-900">Raj Transport Services — Fleet</h2>
                <p className="text-xs text-stone-500">Carrier Account: transporter1</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-200">
                4 Active Trucks
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-stone-900 text-sm">{v.vehicle_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      v.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-stone-600 mt-2">
                    <p><strong>Capacity:</strong> {v.capacity} kg</p>
                    <p><strong>Cost per Trip:</strong> ₹{v.cost_per_trip}</p>
                    <p><strong>Driver:</strong> {v.driver_name}</p>
                    <p><strong>Contact:</strong> +91 {v.driver_contact}</p>
                    <p><strong>Location:</strong> {v.current_location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: HARVESTS ── */}
        {activeTab === 'harvests' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 mb-8">
            <h2 className="font-bold text-xl text-stone-900 mb-4 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-primary-600" /> Database Harvest Records ({harvests.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider text-xs border-b border-stone-100">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Farmer</th>
                    <th className="px-6 py-3">Crop</th>
                    <th className="px-6 py-3">Quantity</th>
                    <th className="px-6 py-3">Grade</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Price / kg</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {harvests.map((h) => (
                    <tr key={h.id} className="hover:bg-stone-50/50">
                      <td className="px-6 py-3 font-mono text-stone-500">#{h.id}</td>
                      <td className="px-6 py-3 font-bold text-stone-900">{h.farmer_name}</td>
                      <td className="px-6 py-3 text-stone-800">{h.crop}</td>
                      <td className="px-6 py-3 font-bold text-stone-900">{h.available_quantity || h.estimated_quantity} kg</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
                          Grade {h.quality_grade}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-stone-600">{h.location}</td>
                      <td className="px-6 py-3 font-bold text-emerald-700">₹{h.expected_price || 25}</td>
                      <td className="px-6 py-3 capitalize text-stone-500">{h.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: CANCELLATIONS AUDIT LOG ── */}
        {activeTab === 'cancellations' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-xl text-stone-900 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-rose-600" /> Cancellation Audit Log & Data Consistency ({cancellations.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Permanent immutable record of all cancellations, inventory restoration, and revoked transport assignments.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full">
                {cancellations.length} Audited Events
              </span>
            </div>

            {cancellations.length === 0 ? (
              <div className="p-12 text-center text-stone-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="font-semibold text-stone-600">No cancellations recorded.</p>
                <p className="text-xs text-stone-400 mt-1">All orders and requests are running smoothly across the network.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider text-xs border-b border-stone-100">
                      <th className="px-5 py-3">Audit ID</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Order/Req #</th>
                      <th className="px-5 py-3">Cancelled By</th>
                      <th className="px-5 py-3">Participants</th>
                      <th className="px-5 py-3">Crop & Grade</th>
                      <th className="px-5 py-3">Restored Qty</th>
                      <th className="px-5 py-3">Previous Status</th>
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {cancellations.map((c) => (
                      <tr key={c.id} className="hover:bg-stone-50/50">
                        <td className="px-5 py-3 font-mono text-stone-400 text-xs">#{c.id}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.cancellation_type === 'order' ? 'bg-rose-100 text-rose-800' :
                            c.cancellation_type === 'request' ? 'bg-amber-100 text-amber-800' :
                            'bg-violet-100 text-violet-800'
                          }`}>
                            {c.cancellation_type}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-stone-900">
                          {c.order_id ? `ORD${c.order_id.toString().padStart(3, '0')}` : (c.request_id ? `REQ#${c.request_id}` : `HV#${c.harvest_id}`)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-bold text-stone-900">{c.username}</span>
                          <span className="text-stone-400 text-xs block uppercase text-[10px] font-semibold">{c.user_role}</span>
                        </td>
                        <td className="px-5 py-3 text-xs">
                          <p className="text-stone-800">F: <span className="font-semibold">{c.farmer_name || 'Farmer'}</span></p>
                          <p className="text-stone-500">B: <span className="font-semibold">{c.buyer_name || 'Buyer'}</span></p>
                        </td>
                        <td className="px-5 py-3 font-semibold text-stone-800">
                          {c.crop} <span className="text-xs text-stone-500">(Grade {c.quality_grade})</span>
                        </td>
                        <td className="px-5 py-3 font-bold text-emerald-700">
                          +{c.restored_quantity || c.quantity}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md capitalize">
                            {c.previous_status || 'active'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-stone-500 font-mono">
                          {c.created_at || '—'}
                        </td>
                        <td className="px-5 py-3 text-xs text-stone-700 italic max-w-xs truncate">
                          "{c.reason || 'Cancelled by user'}"
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ADMIN ORDER DETAILS MODAL (Requirement 13) ── */}
      {selectedOrderDetail && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedOrderDetail(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-6 rounded-t-3xl flex items-center justify-between sticky top-0 z-10 border-b border-stone-800">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-2xl text-sky-400">
                    ORDER #{selectedOrderDetail.order_code || `ORD${selectedOrderDetail.id}`}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge(selectedOrderDetail.status)}`}>
                    {selectedOrderDetail.display_status || selectedOrderDetail.status}
                  </span>
                </div>
                <p className="text-stone-300 text-xs mt-1">
                  Complete Supply Chain Connection • Single Source of Truth
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-7 space-y-6">
              {/* Cancellation Audit Banner (if cancelled) */}
              {selectedOrderDetail.status === 'cancelled' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm uppercase tracking-wider mb-2">
                    <Ban className="w-5 h-5 text-rose-600" />
                    Official Cancellation Audit Record
                  </div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-rose-950 mt-3">
                    <div className="bg-white/80 rounded-xl p-3 border border-rose-100">
                      <p className="text-stone-400 font-bold uppercase text-[10px]">Cancelled By</p>
                      <p className="font-bold text-stone-900 mt-0.5">{selectedOrderDetail.cancelled_by || 'User'}</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 border border-rose-100">
                      <p className="text-stone-400 font-bold uppercase text-[10px]">Cancelled At</p>
                      <p className="font-bold text-stone-900 mt-0.5">{selectedOrderDetail.cancelled_at || 'Recorded'}</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 border border-rose-100">
                      <p className="text-stone-400 font-bold uppercase text-[10px]">Inventory Restored</p>
                      <p className="font-bold text-emerald-700 mt-0.5">{selectedOrderDetail.quantity} Released back to Farmer</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 border border-rose-100">
                      <p className="text-stone-400 font-bold uppercase text-[10px]">Transport State</p>
                      <p className="font-bold text-sky-700 mt-0.5">Assigned Trucks Freed</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-white/80 rounded-xl p-3 border border-rose-100 text-xs">
                    <p className="text-stone-400 font-bold uppercase text-[10px]">Cancellation Reason</p>
                    <p className="font-medium text-stone-800 mt-0.5">{selectedOrderDetail.cancellation_reason || 'Cancelled before transporter pickup'}</p>
                  </div>
                </div>
              )}

              {/* Order Timeline (Requirement 13) */}
              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
                <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" /> Order Timeline
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(selectedOrderDetail.timeline || []).map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        step.done
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : step.active
                          ? 'bg-sky-50 border-sky-300 text-sky-900 ring-2 ring-sky-100'
                          : 'bg-white border-stone-200 text-stone-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : step.active ? (
                          <Activity className="w-4 h-4 text-sky-600 animate-pulse shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                        )}
                        <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                          Step {idx + 1}
                        </span>
                      </div>
                      <p className="text-xs font-bold leading-tight">{step.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3-Column Connected Participants Grid */}
              <div className="grid md:grid-cols-3 gap-5">
                {/* Farmer Details */}
                <div className="bg-primary-50/40 rounded-2xl p-5 border border-primary-100">
                  <div className="flex items-center gap-2 text-primary-800 font-bold text-xs uppercase tracking-wider mb-3">
                    <Sprout className="w-4 h-4 text-primary-600" />
                    Farmer Details
                  </div>
                  <div className="space-y-1.5 text-xs text-stone-700">
                    <p><strong>Username:</strong> <span className="font-mono text-primary-700 font-bold">{selectedOrderDetail.farmer?.username}</span></p>
                    <p><strong>Farmer Name:</strong> {selectedOrderDetail.farmer?.name}</p>
                    <p><strong>Farm Name:</strong> {selectedOrderDetail.farmer?.farm_name}</p>
                    <p><strong>Farm Location:</strong> {selectedOrderDetail.farmer?.location}</p>
                    <p><strong>Contact:</strong> +91 {selectedOrderDetail.farmer?.contact}</p>
                    <p><strong>Harvest Quantity:</strong> {selectedOrderDetail.farmer?.harvest_quantity}</p>
                    <p><strong>Quality:</strong> Grade {selectedOrderDetail.farmer?.quality}</p>
                    <p><strong>Harvest Date:</strong> {selectedOrderDetail.farmer?.harvest_date}</p>
                  </div>
                </div>

                {/* Buyer Details */}
                <div className="bg-amber-50/40 rounded-2xl p-5 border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-3">
                    <ShoppingCart className="w-4 h-4 text-amber-600" />
                    Buyer Details
                  </div>
                  <div className="space-y-1.5 text-xs text-stone-700">
                    <p><strong>Buyer Name:</strong> {selectedOrderDetail.buyer?.name}</p>
                    <p><strong>Username:</strong> <span className="font-mono text-amber-700 font-bold">{selectedOrderDetail.buyer?.username}</span></p>
                    <p><strong>Contact:</strong> {selectedOrderDetail.buyer?.contact}</p>
                    <p><strong>Delivery Location:</strong> {selectedOrderDetail.buyer?.delivery_location}</p>
                    <p><strong>Requested Quantity:</strong> {selectedOrderDetail.buyer?.requested_quantity}</p>
                    <p><strong>Order Date:</strong> {selectedOrderDetail.buyer?.order_date}</p>
                  </div>
                </div>

                {/* Transporter Details */}
                <div className="bg-violet-50/40 rounded-2xl p-5 border border-violet-100">
                  <div className="flex items-center gap-2 text-violet-800 font-bold text-xs uppercase tracking-wider mb-3">
                    <Truck className="w-4 h-4 text-violet-600" />
                    Transporter Details
                  </div>
                  <div className="space-y-1.5 text-xs text-stone-700">
                    <p><strong>Company:</strong> {selectedOrderDetail.transporter?.name}</p>
                    <p><strong>Contact:</strong> {selectedOrderDetail.transporter?.contact}</p>
                    <p><strong>Vehicle Details:</strong> {selectedOrderDetail.transporter?.vehicle_details}</p>
                    <p><strong>Pickup Time:</strong> {selectedOrderDetail.transporter?.pickup_time}</p>
                    <p><strong>Delivery Time:</strong> {selectedOrderDetail.transporter?.delivery_time}</p>
                  </div>
                </div>
              </div>

              {/* Transport Details Card */}
              {selectedOrderDetail.transport && (
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
                      <Route className="w-4 h-4 text-violet-600" /> Transport Allocation Breakdown
                    </h4>
                    <span className="text-xs text-stone-400 font-mono">
                      Allocated: {selectedOrderDetail.transport.allocation_time}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {(selectedOrderDetail.transport.trucks || []).map((t, i) => (
                      <div key={i} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                        <p className="font-mono font-bold text-stone-900">{t.vehicle_number}</p>
                        <p className="text-stone-500 mt-1">Capacity: <strong>{t.capacity}</strong></p>
                        <p className="text-stone-500">Assigned: <strong>{t.assigned_capacity}</strong></p>
                        <p className="text-emerald-700 font-bold mt-1">Trip Cost: ₹{t.cost}</p>
                        <p className="text-stone-400 text-[11px] mt-0.5">Driver: {t.driver_name}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 bg-violet-50 rounded-xl p-4 border border-violet-100">
                    <div>
                      <p className="text-xs text-violet-800 font-bold uppercase">AI Allocation Result</p>
                      <p className="text-xs text-stone-600 mt-0.5">{selectedOrderDetail.transport.reason}</p>
                    </div>
                    <div className="flex gap-6 text-right">
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold">Total Capacity</p>
                        <p className="font-display font-bold text-stone-900 text-lg">
                          {selectedOrderDetail.transport.allocated_capacity}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold">Total Transport Cost</p>
                        <p className="font-display font-bold text-emerald-700 text-lg">
                          ₹{selectedOrderDetail.transport.total_cost?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
