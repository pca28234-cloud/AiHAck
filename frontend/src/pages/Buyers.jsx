import React, { useEffect, useState } from 'react';
import { getBuyers, createBuyer, getOrders, createOrder } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, ShoppingCart, X, User, MapPin, Mail, Repeat } from 'lucide-react';

export default function Buyers() {
  const [buyers, setBuyers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuyerForm, setShowBuyerForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [buyerForm, setBuyerForm] = useState({ name: '', location: '', contact: '' });
  const [orderForm, setOrderForm] = useState({
    buyer_id: '', quantity: '', quality_grade: 'A',
    delivery_date: new Date().toISOString().split('T')[0],
    recurring: false, frequency: 'none',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [b, o] = await Promise.all([getBuyers(), getOrders()]);
      setBuyers(b.data);
      setOrders(o.data);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  };

  const handleCreateBuyer = async (e) => {
    e.preventDefault();
    try {
      await createBuyer(buyerForm);
      setShowBuyerForm(false);
      setBuyerForm({ name: '', location: '', contact: '' });
      setSuccess('Buyer registered successfully!');
      loadData();
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create buyer.'); }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await createOrder({
        ...orderForm,
        buyer_id: parseInt(orderForm.buyer_id),
        quantity: parseFloat(orderForm.quantity),
      });
      setShowOrderForm(false);
      setOrderForm({ buyer_id: '', quantity: '', quality_grade: 'A', delivery_date: new Date().toISOString().split('T')[0], recurring: false, frequency: 'none' });
      setSuccess('Demand order created successfully!');
      loadData();
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create order.'); }
  };

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  if (loading) return <LoadingSpinner message="Loading buyers..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="buyers-page">
      {success && <div className="mb-4 p-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm animate-slide-up">{success}</div>}
      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-slide-up">{error}</div>}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900">Buyers & Demand</h1>
          <p className="text-stone-500 mt-1">Manage buyer profiles and demand orders.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowBuyerForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors shadow-sm" id="btn-add-buyer">
            <Plus className="w-4 h-4" /> Add Buyer
          </button>
          <button onClick={() => setShowOrderForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-harvest-600 text-white font-medium text-sm hover:bg-harvest-700 transition-colors shadow-sm" id="btn-create-demand">
            <ShoppingCart className="w-4 h-4" /> Create Demand
          </button>
        </div>
      </div>

      {/* Buyer Form Modal */}
      {showBuyerForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-stone-900">Register Buyer</h2>
              <button onClick={() => setShowBuyerForm(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateBuyer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5"><User className="w-3.5 h-3.5 inline mr-1" />Name</label>
                <input type="text" required value={buyerForm.name} onChange={(e) => setBuyerForm({...buyerForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="Buyer or company name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Location</label>
                <input type="text" required value={buyerForm.location} onChange={(e) => setBuyerForm({...buyerForm, location: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="City or area" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5"><Mail className="w-3.5 h-3.5 inline mr-1" />Contact</label>
                <input type="text" value={buyerForm.contact} onChange={(e) => setBuyerForm({...buyerForm, contact: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="Email or phone" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors">Register Buyer</button>
            </form>
          </div>
        </div>
      )}

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-stone-900">Create Demand</h2>
              <button onClick={() => setShowOrderForm(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Buyer</label>
                <select required value={orderForm.buyer_id} onChange={(e) => setOrderForm({...orderForm, buyer_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                  <option value="">Select buyer...</option>
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Quantity (kg)</label>
                  <input type="number" step="0.1" min="0.1" required value={orderForm.quantity} onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Quality Required</label>
                  <select value={orderForm.quality_grade} onChange={(e) => setOrderForm({...orderForm, quality_grade: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Delivery Date</label>
                <input type="date" required value={orderForm.delivery_date} onChange={(e) => setOrderForm({...orderForm, delivery_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={orderForm.recurring} onChange={(e) => setOrderForm({...orderForm, recurring: e.target.checked, frequency: e.target.checked ? 'daily' : 'none'})}
                    className="w-4 h-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-stone-700 font-medium"><Repeat className="w-3.5 h-3.5 inline mr-1" />Recurring Delivery</span>
                </label>
                {orderForm.recurring && (
                  <select value={orderForm.frequency} onChange={(e) => setOrderForm({...orderForm, frequency: e.target.value})} className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                )}
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-harvest-600 text-white font-medium hover:bg-harvest-700 transition-colors">Create Demand</button>
            </form>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-card overflow-hidden" id="orders-table">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-display font-semibold text-stone-900">Active Demand Orders</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <ShoppingCart className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No active demand orders. Create a demand to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Quality</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Delivery</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Recurring</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-stone-900">{o.buyer_name}</td>
                    <td className="px-6 py-4 text-right text-stone-700">{o.quantity} kg</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                        o.quality_grade === 'A' ? 'bg-primary-50 text-primary-700' :
                        o.quality_grade === 'B' ? 'bg-harvest-50 text-harvest-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>{o.quality_grade}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-stone-500">{o.delivery_date}</td>
                    <td className="px-6 py-4 text-center">
                      {o.recurring ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                          <Repeat className="w-3 h-3" /> {o.frequency}
                        </span>
                      ) : (
                        <span className="text-stone-400">One-time</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        o.status === 'active' ? 'bg-primary-50 text-primary-700' : 'bg-stone-100 text-stone-600'
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
