import React, { useEffect, useState } from 'react';
import { getBuyers, getOrders, createOrder, getFarmers, getVehicles } from '../services/api';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { ShoppingCart, Plus, Check, Truck, Sprout, X, AlertTriangle, LogOut, History, MapPin, Mail, Activity, Wallet } from 'lucide-react';

export default function BuyerDashboard() {
  const [buyer, setBuyer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('farmers');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    quantity: '', quality_grade: 'A', delivery_date: new Date().toISOString().split('T')[0]
  });
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, oRes, fRes, vRes] = await Promise.all([
        getBuyers(), getOrders(), getFarmers(), getVehicles()
      ]);
      
      if (bRes.data.length > 0) {
        const currentBuyer = bRes.data[0]; // Assuming first buyer is the logged-in user
        setBuyer(currentBuyer);
        const buyerOrders = oRes.data.filter(o => o.buyer_id === currentBuyer.id)
          .sort((a, b) => new Date(b.delivery_date) - new Date(a.delivery_date));
        setOrders(buyerOrders);
      }
      // For demo, we just show all farmers with harvests
      setFarmers(fRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!buyer) return;
    try {
      await createOrder({
        buyer_id: buyer.id,
        quantity: parseFloat(orderForm.quantity),
        quality_grade: orderForm.quality_grade,
        delivery_date: orderForm.delivery_date,
        recurring: false,
        frequency: 'none',
        status: 'active'
      });
      setShowOrderForm(false);
      setOrderForm({ quantity: '', quality_grade: 'A', delivery_date: new Date().toISOString().split('T')[0] });
      setSuccess('Order placed successfully! The AI Coordinator is matching it with farmers.');
      loadData();
    } catch (err) {
      setError('Failed to place order.');
    }
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
  if (!buyer && !loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center text-stone-500">
      <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
      No buyer profile found.
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-50 font-sans pb-12" id="buyer-dashboard">
      
      {/* Buyer Specific Topbar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-harvest-400 to-harvest-600 flex items-center justify-center shadow-lg shadow-harvest-500/20">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-stone-900 tracking-tight">
              Harvest<span className="text-harvest-500">Link</span> AI
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Profile Menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-stone-900">{buyer.name}</p>
                <p className="text-xs text-stone-500">Buyer</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-harvest-100 flex items-center justify-center border-2 border-harvest-50">
                <span className="font-display font-bold text-harvest-700">{buyer.name.charAt(0)}</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-rose-500 transition-colors ml-2" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {success && <div className="mb-6 p-4 rounded-xl bg-harvest-50 border border-harvest-200 text-harvest-800 text-sm animate-slide-up shadow-sm flex items-center gap-3"><Check className="w-5 h-5 text-harvest-500" /> {success}</div>}
        {error && <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-slide-up shadow-sm flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-500" /> {error}</div>}

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <ShoppingCart className="w-64 h-64 text-white transform rotate-12 translate-x-12 -translate-y-12" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-stone-400 font-medium mb-1">Welcome back,</p>
              <h1 className="font-display text-4xl font-bold text-white tracking-tight">{buyer.name}</h1>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-stone-300">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-harvest-400" /> {buyer.location}</span>
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-harvest-400" /> {buyer.contact}</span>
              </div>
            </div>
            <button onClick={() => setShowOrderForm(true)} className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-harvest-500 text-white font-bold hover:bg-harvest-400 transition-all shadow-lg shadow-harvest-500/30 hover:shadow-harvest-500/50 hover:-translate-y-1">
              <Plus className="w-6 h-6" /> Place New Order
            </button>
          </div>
        </div>

        {/* 2-Column Dashboard Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Order History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden h-full">
              <div className="px-8 py-6 border-b border-stone-100 flex items-center gap-3 bg-stone-50/50">
                <div className="w-10 h-10 rounded-xl bg-harvest-50 flex items-center justify-center">
                  <History className="w-5 h-5 text-harvest-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-stone-900">Order History</h2>
                  <p className="text-sm text-stone-500">Your past and active tomato requests</p>
                </div>
              </div>
              
              {orders.length === 0 ? (
                <div className="p-16 text-center text-stone-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">You haven't placed any orders yet.</p>
                  <button onClick={() => setShowOrderForm(true)} className="mt-4 text-harvest-600 font-medium hover:underline">Place your first order</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-stone-50/80 text-stone-500 font-semibold uppercase tracking-wider text-xs border-b border-stone-100">
                        <th className="px-8 py-4">Delivery By</th>
                        <th className="px-8 py-4 text-right">Quantity</th>
                        <th className="px-8 py-4 text-center">Quality</th>
                        <th className="px-8 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {orders.map((o, i) => (
                        <tr key={o.id} className="hover:bg-stone-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <span className={`font-semibold ${i === 0 ? 'text-stone-900' : 'text-stone-600'}`}>{o.delivery_date}</span>
                            {i === 0 && <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-700">Latest</span>}
                          </td>
                          <td className="px-8 py-5 text-right font-display font-bold text-stone-900 text-base">
                            {o.quantity} <span className="text-xs font-sans text-stone-500 font-normal">kg</span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm font-bold shadow-sm ${
                              o.quality_grade === 'A' ? 'bg-primary-50 text-primary-700 border border-primary-100' :
                              o.quality_grade === 'B' ? 'bg-harvest-50 text-harvest-700 border border-harvest-100' :
                              'bg-stone-100 text-stone-700 border border-stone-200'
                            }`}>
                              {o.quality_grade}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                              o.status === 'active' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                              o.status === 'fulfilled' ? 'bg-primary-50 text-primary-700 border border-primary-100' :
                              'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}>
                              {o.status}
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
                  <p className="text-xs text-stone-500">Matched fulfillment details</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-stone-100 bg-white p-3 gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('alerts')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'alerts' ? 'bg-stone-900 text-white shadow-md shadow-stone-900/20' : 'text-stone-500 hover:bg-stone-100'}`}>Alerts</button>
                <button onClick={() => setActiveTab('farmers')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'farmers' ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'text-stone-500 hover:bg-stone-100'}`}>
                  Farmers {farmers.length > 0 && <span className="ml-1 opacity-90">({farmers.length})</span>}
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

                {activeTab === 'farmers' && (
                  farmers.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-sm">No matched farmers yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {farmers.map(f => (
                        <div key={`farmer-${f.id}`} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                              <Sprout className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-stone-900 leading-snug">Farmer <span className="font-bold">{f.name}</span> has harvests ready in <span className="font-medium text-primary-700">{f.location}</span>.</p>
                              <p className="text-xs text-stone-500 mt-1 font-medium">{f.producer_type === 'small' ? 'Small' : 'Large'} Producer ({f.farm_size} ha)</p>
                              <button onClick={() => { setSuccess(`Requested direct allocation from ${f.name}.`); }} className="mt-4 w-full py-2 rounded-lg bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors shadow-sm">
                                View Allocated Crops
                              </button>
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
                              <p className="text-sm text-stone-900 leading-snug">Transporter <span className="font-bold">{v.vehicle_number}</span> is delivering your order.</p>
                              <p className="text-xs text-stone-500 mt-1 font-medium">Status: <span className="text-violet-700">En Route</span></p>
                              <button onClick={() => { setSuccess(`Tracking transporter ${v.vehicle_number}.`); }} className="mt-4 w-full py-2 rounded-lg bg-violet-100 text-violet-700 text-xs font-bold hover:bg-violet-200 transition-colors">
                                Track Delivery
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
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Outstanding Balance</p>
                      <h3 className="font-display text-3xl font-bold">₹ 15,000</h3>
                      <button onClick={() => setSuccess('Payment processed successfully!')} className="mt-4 w-full py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold shadow-md hover:bg-stone-50 transition-colors">
                        Pay Now
                      </button>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-stone-900">Recent Transactions</span>
                        <span className="text-xs font-bold text-stone-500">This Month</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm border-b border-stone-50 pb-2">
                          <span className="text-stone-600">Paid to Ravi Kumar (Farmer)</span>
                          <span className="font-bold text-emerald-600">-₹ 8,500</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-stone-50 pb-2">
                          <span className="text-stone-600">Transport Fee (Logistics Inc)</span>
                          <span className="font-bold text-emerald-600">-₹ 1,200</span>
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

      {/* Place Order Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-bold text-stone-900">Place New Order</h2>
              <button onClick={() => setShowOrderForm(false)} className="p-2 hover:bg-stone-100 rounded-xl transition-colors"><X className="w-5 h-5 text-stone-500" /></button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Required Quantity (kg)</label>
                <input type="number" step="1" min="1" required value={orderForm.quantity} onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base focus:outline-none focus:ring-2 focus:ring-harvest-500/30 focus:border-harvest-500 transition-all font-medium" placeholder="e.g. 1000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Min Quality Grade</label>
                  <select value={orderForm.quality_grade} onChange={(e) => setOrderForm({...orderForm, quality_grade: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base focus:outline-none focus:ring-2 focus:ring-harvest-500/30 focus:border-harvest-500 transition-all font-medium">
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Needed By</label>
                  <input type="date" required value={orderForm.delivery_date} onChange={(e) => setOrderForm({...orderForm, delivery_date: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-harvest-500/30 focus:border-harvest-500 transition-all font-medium" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 mt-4 rounded-xl bg-harvest-600 text-white font-bold text-lg hover:bg-harvest-700 transition-colors shadow-lg shadow-harvest-500/30 hover:-translate-y-0.5">Submit Order</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
