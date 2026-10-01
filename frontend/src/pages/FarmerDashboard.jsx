import React, { useEffect, useState, useCallback } from 'react';
import {
  getFarmers, getHarvests, createHarvest, getBuyerRequests,
  acceptOrder, rejectOrder, getTransportRecommendation,
  getNotifications, getOrdersExtended, parseHarvest
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import TransportPanel from '../components/TransportPanel';
import NotificationsPanel from '../components/NotificationsPanel';
import OrderStatusTracker from '../components/OrderStatusTracker';
import {
  Sprout, Plus, Check, Truck, X, AlertTriangle, LogOut,
  Bell, Package, MapPin, Ruler, Activity, Eye, EyeOff,
  User, FileText, Landmark, Bot, RefreshCw, ChevronRight,
  IndianRupee, BarChart3, Clock, Shield, CreditCard, Phone, Mail,
  Send, Loader, Sparkles
} from 'lucide-react';

export default function FarmerDashboard() {
  const [farmer, setFarmer] = useState(null);
  const [harvests, setHarvests] = useState([]);
  const [requests, setRequests] = useState([]);   // BuyerRequests for this farmer
  const [orders, setOrders] = useState([]);        // Active accepted orders
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [activeTab, setActiveTab] = useState('requests');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [showPan, setShowPan] = useState(false);
  const [submittingHarvest, setSubmittingHarvest] = useState(false);

  // AI Assistant states
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParsed, setAiParsed] = useState(null);
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'ai',
      text: "👋 Hello! I'm your AI Harvest Assistant.\n\nTell me what you've harvested in natural language — for example:\n• \"I harvested 500 kg of Grade A tomatoes ready tomorrow at 25 per kg\"\n• \"Add 1200 kg tomato grade B in Kolar\"\n\nI'll automatically parse and register your harvest!"
    }
  ]);

  const [harvestForm, setHarvestForm] = useState({
    crop: 'Tomato',
    estimated_quantity: '',
    quality_grade: 'A',
    harvest_date: new Date().toISOString().split('T')[0],
    available_date: new Date().toISOString().split('T')[0],
    location: '',
    expected_price: '',
  });

  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const [fRes, hRes, brRes, oRes, nRes] = await Promise.allSettled([
        getFarmers(),
        getHarvests(),
        getBuyerRequests(),
        getOrdersExtended(),
        getNotifications('farmer'),
      ]);

      let currentFarmer = null;
      if (fRes.status === 'fulfilled' && fRes.value.data?.length > 0) {
        currentFarmer = fRes.value.data[0];
        setFarmer(currentFarmer);
      }

      if (hRes.status === 'fulfilled' && hRes.value.data) {
        setHarvests(hRes.value.data);
      }

      if (brRes.status === 'fulfilled' && brRes.value.data) {
        setRequests(brRes.value.data);
      }

      if (oRes.status === 'fulfilled' && oRes.value.data) {
        setOrders(oRes.value.data);
      }

      if (nRes.status === 'fulfilled' && nRes.value.data) {
        setNotifications(nRes.value.data);
      }
    } catch (err) {
      console.error('Error loading farmer dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time WebSocket updates
  const handleWsEvent = useCallback((event, data) => {
    console.log('[WS Farmer]', event, data);
    if (event === 'buyer_request_created') {
      setSuccess(`📬 New buyer request received for ${data.quantity} kg!`);
      loadData();
    } else if (event === 'transport_allocated') {
      setSuccess(`🚛 Transport allocated for Order #${data.order_id}`);
      loadData();
    } else if (event === 'notification') {
      setNotifications(prev => [data, ...prev]);
    } else if (event === 'truck_status_updated') {
      setSuccess(`Truck ${data.vehicle_number}: ${data.old_status} → ${data.new_status}`);
      loadData();
    }
  }, [loadData]);

  useWebSocket('farmer', handleWsEvent);

  // Auto-dismiss success/error
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const handleAccept = async (orderId) => {
    try {
      await acceptOrder(orderId);
      setSuccess(`✅ Order #${orderId} accepted! AI is allocating trucks...`);
      setSelectedOrderId(orderId);
      setActiveTab('orders');
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to accept order.');
    }
  };

  const handleReject = async (orderId) => {
    try {
      await rejectOrder(orderId);
      setSuccess('Order rejected.');
      await loadData();
    } catch (e) {
      setError('Failed to reject order.');
    }
  };

  const handleCreateHarvest = async (e) => {
    e.preventDefault();
    setSubmittingHarvest(true);
    try {
      let activeFarmer = farmer;
      if (!activeFarmer) {
        const res = await getFarmers();
        if (res.data?.length > 0) {
          activeFarmer = res.data[0];
          setFarmer(activeFarmer);
        }
      }
      const farmerId = activeFarmer?.id || 1;

      await createHarvest({
        farmer_id: farmerId,
        crop: harvestForm.crop || 'Tomato',
        estimated_quantity: parseFloat(harvestForm.estimated_quantity),
        quality_grade: harvestForm.quality_grade || 'A',
        harvest_date: harvestForm.harvest_date || new Date().toISOString().split('T')[0],
        available_date: harvestForm.available_date || harvestForm.harvest_date || new Date().toISOString().split('T')[0],
        location: harvestForm.location || activeFarmer?.location || 'Kolar District',
        expected_price: harvestForm.expected_price ? parseFloat(harvestForm.expected_price) : null,
        status: 'estimated',
      });

      setShowHarvestForm(false);
      setHarvestForm({
        crop: 'Tomato',
        estimated_quantity: '',
        quality_grade: 'A',
        harvest_date: new Date().toISOString().split('T')[0],
        available_date: new Date().toISOString().split('T')[0],
        location: '',
        expected_price: ''
      });
      setSuccess('✅ Harvest added successfully! Available to buyers & transport.');
      await loadData();
    } catch (err) {
      console.error('Submit harvest error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to add harvest.');
    } finally {
      setSubmittingHarvest(false);
    }
  };

  // ── AI ASSISTANT HANDLERS ──
  const handleAISend = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setAiLoading(true);
    setAiParsed(null);

    let parsedData = null;
    try {
      const activeFarmerId = farmer?.id || 1;
      const res = await parseHarvest({ farmer_id: activeFarmerId, text: userMsg });
      if (res.data && res.data.estimated_quantity) {
        parsedData = {
          crop: res.data.crop || 'Tomato',
          estimated_quantity: res.data.estimated_quantity,
          quality_grade: res.data.quality_grade || 'A',
          harvest_date: res.data.harvest_date || new Date().toISOString().split('T')[0],
          available_date: res.data.available_date || new Date().toISOString().split('T')[0],
          location: res.data.location || farmer?.location || 'Kolar District',
          expected_price: res.data.expected_price || null,
        };
      }
    } catch (e) {
      console.warn('Backend NLP parsing fallback to regex:', e);
    }

    if (!parsedData) {
      await new Promise(r => setTimeout(r, 450));
      const lower = userMsg.toLowerCase();
      const qtyMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kgs|quintals?|tons?)/i) || lower.match(/(\d+)\s*(?:bags?|crates?)/i) || lower.match(/(\d+)/);
      const gradeMatch = lower.match(/grade\s*([abc])/i) || lower.match(/\b([abc])\s*grade\b/i);
      const priceMatch = lower.match(/(?:rs\.?|₹|inr)\s*(\d+(?:\.\d+)?)/i) || lower.match(/(\d+(?:\.\d+)?)\s*(?:rs|rupees?|\/kg|per\s*kg)/i);
      const cropMatch = lower.match(/(tomato(?:es)?|potato(?:es)?|onion(?:s)?|carrot(?:s)?|cabbage|chilli|mango(?:es)?)/i);

      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : null;
      const grade = gradeMatch ? gradeMatch[1].toUpperCase() : 'A';
      const price = priceMatch ? parseFloat(priceMatch[1]) : (grade === 'A' ? 28 : (grade === 'B' ? 22 : 16));
      const crop = cropMatch ? (cropMatch[1].charAt(0).toUpperCase() + cropMatch[1].slice(1)) : 'Tomato';

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = lower.includes('tomorrow') ? tomorrow.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      if (qty) {
        parsedData = {
          crop,
          estimated_quantity: qty,
          quality_grade: grade,
          harvest_date: dateStr,
          available_date: dateStr,
          location: farmer?.location || 'Kolar District',
          expected_price: price,
        };
      }
    }

    if (parsedData && parsedData.estimated_quantity) {
      setAiParsed(parsedData);
      setAiMessages(prev => [...prev, {
        role: 'ai',
        text: `✅ **Harvest Identified!**\n\n• **Crop:** ${parsedData.crop}\n• **Quantity:** ${parsedData.estimated_quantity} kg\n• **Quality:** Grade ${parsedData.quality_grade}\n• **Harvest Date:** ${parsedData.harvest_date}\n• **Price:** ₹${parsedData.expected_price || 'Market Rate'}/kg\n• **Location:** ${parsedData.location}\n\nWould you like me to register this harvest now? Click **"Confirm & Add Harvest"** below.`
      }]);
    } else {
      setAiMessages(prev => [...prev, {
        role: 'ai',
        text: `⚠️ I couldn't identify the quantity from your message. Please specify the quantity, e.g.:\n\n*"I have 500 kg of Grade A tomatoes ready for harvest tomorrow at ₹25/kg."*`
      }]);
    }
    setAiLoading(false);
  };

  const handleAIConfirm = async () => {
    if (!aiParsed) return;
    try {
      const activeFarmerId = farmer?.id || 1;
      await createHarvest({
        farmer_id: activeFarmerId,
        crop: aiParsed.crop || 'Tomato',
        estimated_quantity: parseFloat(aiParsed.estimated_quantity),
        quality_grade: aiParsed.quality_grade || 'A',
        harvest_date: aiParsed.harvest_date,
        available_date: aiParsed.available_date || aiParsed.harvest_date,
        location: aiParsed.location || farmer?.location || 'Kolar District',
        expected_price: aiParsed.expected_price ? parseFloat(aiParsed.expected_price) : null,
        status: 'estimated',
      });
      setAiMessages(prev => [...prev, {
        role: 'ai',
        text: `🎉 **Logged successfully!** Added **${aiParsed.estimated_quantity} kg** of ${aiParsed.crop} (Grade ${aiParsed.quality_grade}) to your account. Buyers and transport can now connect with you in real time!`
      }]);
      setAiParsed(null);
      setSuccess(`✅ Added ${aiParsed.estimated_quantity} kg harvest via AI!`);
      await loadData();
    } catch (err) {
      console.error('Failed to log harvest via AI:', err);
      setAiMessages(prev => [...prev, {
        role: 'ai',
        text: `❌ Could not save harvest: ${err.response?.data?.detail || err.message || 'Please try again.'}`
      }]);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  const gradeColor = { A: 'bg-primary-100 text-primary-700', B: 'bg-amber-100 text-amber-700', C: 'bg-stone-100 text-stone-600' };

  return (
    <div className="min-h-screen bg-stone-50 font-sans" id="farmer-dashboard">

      {/* Topbar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-stone-900">HarvestLink <span className="text-primary-500">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab('notifications')} className="relative p-2 rounded-xl hover:bg-stone-100 transition-colors">
              <Bell className="w-5 h-5 text-stone-500" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="font-bold text-primary-700 text-sm">{farmer?.name?.charAt(0) || 'F'}</span>
              </div>
              <span className="text-sm font-semibold text-stone-700 hidden sm:block">{farmer?.name?.split('—')[0]?.trim() || 'Farmer'}</span>
            </button>
            <button onClick={() => navigate('/')} className="p-2 text-stone-400 hover:text-rose-500 transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Toast */}
        {success && <div className="mb-4 p-4 rounded-xl bg-primary-50 border border-primary-200 text-primary-800 text-sm flex items-center gap-3 shadow-sm animate-slide-up"><Check className="w-4 h-4" />{success}</div>}
        {error && <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3 shadow-sm animate-slide-up"><AlertTriangle className="w-4 h-4" />{error}</div>}

        {/* Hero */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-7 mb-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-5 pointer-events-none p-8">
            <Sprout className="w-48 h-48" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <p className="text-stone-400 text-sm mb-1">Welcome back,</p>
              <h1 className="font-bold text-2xl sm:text-3xl text-white">{farmer?.name?.split('—')[1]?.trim() || farmer?.name || 'Farmer'}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-stone-300 text-sm">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary-400" />{farmer?.location || 'Kolar'}</span>
                <span className="flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-primary-400" />{farmer?.farm_size || 4.2} ha</span>
                {pendingRequests.length > 0 && (
                  <span className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full text-xs font-bold">
                    🔔 {pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            
            {/* AI Assistant + Manual Add Harvest Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowAIChat(true)}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-lg shadow-violet-600/30 hover:-translate-y-0.5"
                title="Log harvest using natural language AI"
              >
                <Bot className="w-5 h-5 text-violet-200" /> AI Assistant
              </button>
              <button
                onClick={() => setShowHarvestForm(true)}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-bold transition-all shadow-lg shadow-primary-500/30 hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" /> Add Harvest
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'My Harvests', value: harvests.length, color: 'text-primary-400' },
              { label: 'Pending Requests', value: pendingRequests.length, color: 'text-rose-400' },
              { label: 'Active Orders', value: orders.filter(o => !['delivered','rejected'].includes(o.status)).length, color: 'text-amber-400' },
              { label: 'Notifications', value: unreadCount, color: 'text-sky-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3">
                <p className={`font-bold text-xl ${s.color}`}>{s.value}</p>
                <p className="text-stone-400 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1 mb-6 overflow-x-auto no-scrollbar">
          {[
            { key: 'requests', label: 'Buyer Requests', badge: pendingRequests.length },
            { key: 'harvests', label: 'My Harvests' },
            { key: 'orders', label: 'Active Orders', badge: orders.filter(o => !['delivered','rejected'].includes(o.status)).length },
            { key: 'notifications', label: 'Notifications', badge: unreadCount },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === t.key ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white text-stone-900' : 'bg-rose-500 text-white'}`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">

            {/* ── BUYER REQUESTS ── */}
            {activeTab === 'requests' && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-xl text-stone-900">Buyer Requests</h2>
                    <p className="text-sm text-stone-500">Review and respond to incoming purchase requests</p>
                  </div>
                  <button onClick={loadData} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4 text-stone-400" />
                  </button>
                </div>
                {requests.length === 0 ? (
                  <div className="p-12 text-center text-stone-400">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No buyer requests yet. Add a harvest or use the AI Assistant to get started!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {requests.map(r => {
                      const linkedOrder = orders.find(o => o.id === r.order_id);
                      const assignedTrucks = linkedOrder?.transport?.trucks || [];

                      return (
                        <div key={r.id} className="p-6 hover:bg-stone-50/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-stone-900">{r.buyer_name}</span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  r.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  r.status === 'accepted' ? 'bg-primary-50 text-primary-700 border-primary-100' :
                                  'bg-stone-100 text-stone-500 border-stone-200'
                                }`}>{r.status}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-600 mt-2">
                                <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-stone-400" />{r.crop}</span>
                                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-stone-400" />{r.quantity} kg</span>
                                <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-stone-400" />Grade {r.quality_grade}</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-stone-400" />By {r.delivery_date}</span>
                              </div>
                              {r.delivery_location && (
                                <p className="text-xs text-stone-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{r.delivery_location}</p>
                              )}
                              {r.message && <p className="text-xs text-stone-500 mt-1 italic">"{r.message}"</p>}

                              {/* Show assigned truck & driver name if already accepted */}
                              {assignedTrucks.length > 0 && (
                                <div className="mt-3 bg-violet-50/70 border border-violet-100 rounded-xl p-3">
                                  <p className="text-[11px] font-bold text-violet-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Truck className="w-3.5 h-3.5 text-violet-600" />
                                    Assigned Trucks & Drivers:
                                  </p>
                                  <div className="space-y-1.5">
                                    {assignedTrucks.map((trk, i) => (
                                      <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-2.5 py-1.5 border border-violet-100/60">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-stone-900">{trk.vehicle_number}</span>
                                          <span className="text-stone-300">·</span>
                                          <span className="text-stone-700 font-medium flex items-center gap-1">
                                            <User className="w-3 h-3 text-stone-400" /> {trk.driver_name || 'Transporter Fleet'}
                                          </span>
                                        </div>
                                        {trk.driver_contact && (
                                          <span className="text-stone-500 flex items-center gap-1 text-[11px]">
                                            <Phone className="w-2.5 h-2.5 text-stone-400" /> {trk.driver_contact}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {r.status === 'pending' && (
                              <div className="flex sm:flex-col gap-2">
                                <button
                                  onClick={() => handleAccept(r.order_id)}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors shadow-sm"
                                >
                                  <Check className="w-4 h-4" /> Accept
                                </button>
                                <button
                                  onClick={() => handleReject(r.order_id)}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-colors"
                                >
                                  <X className="w-4 h-4" /> Reject
                                </button>
                              </div>
                            )}
                            {r.status === 'accepted' && r.order_id && (
                              <button
                                onClick={() => { setSelectedOrderId(r.order_id); setActiveTab('orders'); }}
                                className="px-4 py-2 rounded-xl bg-violet-100 text-violet-700 text-sm font-bold hover:bg-violet-200 transition-colors flex items-center gap-1.5"
                              >
                                <Truck className="w-4 h-4" /> View Transport
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── MY HARVESTS ── */}
            {activeTab === 'harvests' && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-xl text-stone-900">My Harvests</h2>
                    <p className="text-sm text-stone-500">Crops available for buyers</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowAIChat(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-100 text-violet-700 text-sm font-bold hover:bg-violet-200 transition-colors">
                      <Bot className="w-4 h-4" /> AI Add
                    </button>
                    <button onClick={() => setShowHarvestForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors">
                      <Plus className="w-4 h-4" /> Add Form
                    </button>
                  </div>
                </div>
                {harvests.length === 0 ? (
                  <div className="p-12 text-center text-stone-400">
                    <Sprout className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No harvests yet. Add your first harvest using the AI Assistant or Add Form!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 uppercase text-xs font-semibold tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Crop</th>
                          <th className="px-6 py-3">Quantity</th>
                          <th className="px-6 py-3">Grade</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Price/kg</th>
                          <th className="px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {harvests.map(h => (
                          <tr key={h.id} className="hover:bg-stone-50/50">
                            <td className="px-6 py-4 font-semibold text-stone-900">{h.crop}</td>
                            <td className="px-6 py-4 font-bold text-stone-900">
                              {h.sorted_quantity || h.estimated_quantity} <span className="font-normal text-stone-400 text-xs">kg</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor[h.quality_grade] || 'bg-stone-100 text-stone-700'}`}>Grade {h.quality_grade}</span>
                            </td>
                            <td className="px-6 py-4 text-stone-600">{h.harvest_date}</td>
                            <td className="px-6 py-4 text-stone-600">
                              {h.expected_price ? `₹${h.expected_price}/kg` : '—'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                                h.status === 'sorted' ? 'bg-primary-50 text-primary-700' :
                                h.status === 'allocated' ? 'bg-violet-50 text-violet-700' :
                                'bg-amber-50 text-amber-700'
                              }`}>{h.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ACTIVE ORDERS ── */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
                    <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No active orders yet. Accept a buyer request to get started.</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                        selectedOrderId === order.id ? 'border-violet-300 ring-2 ring-violet-100' : 'border-stone-200'
                      }`}
                      onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-stone-900">Order #{order.id}</span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                order.status === 'transport_allocated' ? 'bg-violet-50 text-violet-700 border-violet-100' :
                                order.status === 'accepted' ? 'bg-primary-50 text-primary-700 border-primary-100' :
                                order.status === 'delivered' ? 'bg-stone-100 text-stone-600 border-stone-200' :
                                'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>{order.status?.replace('_', ' ')}</span>
                            </div>
                            <p className="text-sm text-stone-600">
                              <span className="font-semibold">{order.buyer_name}</span> — {order.quantity} kg Grade {order.quality_grade} {order.crop}
                            </p>
                            {order.transport && (
                              <p className="text-xs text-violet-600 font-semibold mt-1">
                                🚛 {order.transport.trucks_count} truck(s) allocated · ₹{order.transport.total_cost?.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <ChevronRight className={`w-5 h-5 text-stone-400 transition-transform ${selectedOrderId === order.id ? 'rotate-90' : ''}`} />
                        </div>

                        {/* Assigned Transporters and Truck Numbers */}
                        {order.transport?.trucks && order.transport.trucks.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-stone-100">
                            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-violet-600" />
                              Assigned Transporters & Trucks:
                            </p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {order.transport.trucks.map((truck, idx) => (
                                <div key={idx} className="bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs flex-shrink-0">
                                      🚛
                                    </div>
                                    <div>
                                      <p className="font-bold text-stone-900 text-xs font-mono">{truck.vehicle_number}</p>
                                      <p className="text-[11px] text-stone-600 flex items-center gap-1">
                                        <User className="w-3 h-3 text-stone-400" /> {truck.driver_name || 'Transporter Fleet'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 capitalize">
                                      {truck.status?.replace('_', ' ') || 'Assigned'}
                                    </span>
                                    {truck.driver_contact && (
                                      <p className="text-[10px] text-stone-400 mt-0.5 flex items-center justify-end gap-1">
                                        <Phone className="w-2.5 h-2.5" /> {truck.driver_contact}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedOrderId === order.id && (
                          <div className="mt-4">
                            <OrderStatusTracker status={order.status} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h2 className="font-bold text-xl text-stone-900 mb-4">Notifications</h2>
                <NotificationsPanel
                  notifications={notifications}
                  onMarkRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))}
                  maxShown={20}
                />
              </div>
            )}
          </div>

          {/* Right Column: Transport Panel */}
          <div className="lg:col-span-1">
            {selectedOrderId ? (
              <TransportPanel
                orderId={selectedOrderId}
                onStatusChange={loadData}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 text-center text-stone-400">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-stone-700 mb-1">AI Transport Coordination</p>
                <p className="text-xs text-stone-500">Select an order above to view real-time truck allocation and status.</p>
              </div>
            )}

            {/* Recent Harvests Summary */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 mt-4">
              <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
                <Sprout className="w-4 h-4 text-primary-600" /> Harvest Summary
              </h3>
              <div className="space-y-2">
                {['A', 'B', 'C'].map(g => {
                  const total = harvests.filter(h => h.quality_grade === g).reduce((s, h) => s + (h.sorted_quantity || h.estimated_quantity || 0), 0);
                  return (
                    <div key={g} className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColor[g]}`}>Grade {g}</span>
                      <span className="text-sm font-bold text-stone-900">{total} kg</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADD HARVEST MODAL (MANUAL FORM) ── */}
      {showHarvestForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowHarvestForm(false)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md mx-4 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-xl text-stone-900">Add New Harvest</h2>
                <p className="text-xs text-stone-500">Log harvest quantity and details</p>
              </div>
              <button onClick={() => setShowHarvestForm(false)} className="p-2 hover:bg-stone-100 rounded-xl"><X className="w-5 h-5 text-stone-500" /></button>
            </div>
            <form onSubmit={handleCreateHarvest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Crop</label>
                  <input type="text" required value={harvestForm.crop} onChange={e => setHarvestForm({ ...harvestForm, crop: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Quantity (kg)</label>
                  <input type="number" step="0.1" min="1" required value={harvestForm.estimated_quantity} onChange={e => setHarvestForm({ ...harvestForm, estimated_quantity: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    placeholder="e.g. 1500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Quality Grade</label>
                  <select value={harvestForm.quality_grade} onChange={e => setHarvestForm({ ...harvestForm, quality_grade: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                    <option value="A">Grade A (Premium)</option>
                    <option value="B">Grade B (Standard)</option>
                    <option value="C">Grade C (Economy)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Price per kg (₹)</label>
                  <input type="number" step="0.5" min="1" value={harvestForm.expected_price} onChange={e => setHarvestForm({ ...harvestForm, expected_price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    placeholder="e.g. 25" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Harvest Date</label>
                  <input type="date" required value={harvestForm.harvest_date} onChange={e => setHarvestForm({ ...harvestForm, harvest_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Available From</label>
                  <input type="date" value={harvestForm.available_date} onChange={e => setHarvestForm({ ...harvestForm, available_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Farm Location</label>
                <input type="text" value={harvestForm.location} onChange={e => setHarvestForm({ ...harvestForm, location: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder={farmer?.location || 'e.g. Kolar District'} />
              </div>
              <button
                type="submit"
                disabled={submittingHarvest}
                className="w-full py-3.5 rounded-xl bg-primary-600 text-white font-bold text-base hover:bg-primary-700 transition-colors shadow-lg mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingHarvest ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {submittingHarvest ? 'Adding Harvest...' : 'Submit Harvest'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── AI HARVEST CHAT MODAL ── */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={() => setShowAIChat(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg mx-4 mb-4 sm:mb-0 shadow-2xl animate-scale-in overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-600 to-violet-800 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg">AI Harvest Assistant</h2>
                  <p className="text-violet-200 text-xs">Speak or type your harvest in plain sentences</p>
                </div>
              </div>
              <button onClick={() => setShowAIChat(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50" style={{ minHeight: '280px', maxHeight: '50vh' }}>
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-violet-600" />
                    </div>
                  )}
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white text-stone-800 border border-stone-200 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center mr-2 flex-shrink-0">
                    <Bot className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="bg-white border border-stone-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                    <Loader className="w-4 h-4 text-violet-500 animate-spin" />
                    <span className="text-stone-500 text-sm">AI is parsing your harvest details...</span>
                  </div>
                </div>
              )}
              {aiParsed && (
                <div className="flex justify-start pt-2">
                  <div className="w-8 h-8 mr-2 flex-shrink-0" />
                  <button
                    onClick={handleAIConfirm}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors shadow-md hover:-translate-y-0.5"
                  >
                    <Check className="w-4 h-4" /> Confirm & Add Harvest
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAISend()}
                  className="flex-1 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none text-sm"
                  placeholder="e.g. I have 400 kg Grade A tomatoes for tomorrow at ₹25/kg..."
                />
                <button
                  onClick={handleAISend}
                  disabled={aiLoading || !aiInput.trim()}
                  className="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="Send message to AI"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE MODAL ── */}
      {showProfileModal && farmer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 p-7">
              <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl"><X className="w-5 h-5 text-white/60" /></button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary-500 flex items-center justify-center text-2xl font-bold text-white">{farmer.name.charAt(0)}</div>
                <div>
                  <h2 className="font-bold text-xl text-white">{farmer.name}</h2>
                  <p className="text-stone-400 text-sm capitalize">{farmer.producer_type} Producer</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Location', value: farmer.location, icon: MapPin },
                { label: 'Farm Size', value: `${farmer.farm_size} hectares`, icon: Ruler },
                { label: 'Phone', value: farmer.phone ? `+91 ${farmer.phone}` : '—', icon: Phone },
                { label: 'PAN Card', value: showPan ? farmer.pan_card : (farmer.pan_card ? `${farmer.pan_card?.substring(0,2)}****${farmer.pan_card?.substring(-2)}` : '—'), icon: CreditCard,
                  extra: <button onClick={() => setShowPan(!showPan)} className="p-1">{showPan ? <EyeOff className="w-3.5 h-3.5 text-stone-400" /> : <Eye className="w-3.5 h-3.5 text-stone-400" />}</button> },
                { label: 'Aadhaar', value: farmer.aadhaar_last4 ? `XXXX XXXX ${farmer.aadhaar_last4}` : '—', icon: Shield },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-stone-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm font-bold text-stone-900">{item.value || '—'}</p>
                  </div>
                  {item.extra}
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowProfileModal(false)} className="w-full py-3 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
