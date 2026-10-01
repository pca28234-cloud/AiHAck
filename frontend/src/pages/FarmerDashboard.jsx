import React, { useEffect, useState } from 'react';
import { getFarmers, getHarvests, createHarvest, getOrders, getVehicles } from '../services/api';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Sprout, Plus, Check, Truck, ShoppingCart, X, AlertTriangle, LogOut,
  History, MapPin, Ruler, Activity, Wallet, CreditCard, Phone, Mail,
  Shield, ChevronRight, BarChart3, TrendingUp, Leaf, Eye, EyeOff,
  Map, User, FileText, Landmark, Star, Package, Bot, Send, Loader
} from 'lucide-react';

export default function FarmerDashboard() {
  const [farmer, setFarmer] = useState(null);
  const [harvests, setHarvests] = useState([]);
  const [buyerRequests, setBuyerRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('buyers');
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPan, setShowPan] = useState(false);
  const [harvestForm, setHarvestForm] = useState({
    estimated_quantity: '', quality_grade: 'A', harvest_date: new Date().toISOString().split('T')[0]
  });
  const [success, setSuccess] = useState(null);

  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI Harvest Assistant. Describe your harvest in plain English — e.g. \"I have 400 kg of Grade A tomatoes ready for tomorrow.\"" }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParsed, setAiParsed] = useState(null);

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

  const handleAISend = async () => {
    if (!aiInput.trim() || !farmer) return;
    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setAiLoading(true);
    setAiParsed(null);

    await new Promise(r => setTimeout(r, 1200));

    const lower = userMsg.toLowerCase();
    const qtyMatch = lower.match(/(\d+)\s*kg/);
    const gradeMatch = lower.match(/grade\s*([abc])/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : null;
    const grade = gradeMatch ? gradeMatch[1].toUpperCase() : 'A';
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = lower.includes('tomorrow') ? tomorrow.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    if (qty) {
      const parsed = { estimated_quantity: qty, quality_grade: grade, harvest_date: dateStr };
      setAiParsed(parsed);
      setAiMessages(prev => [...prev, {
        role: 'ai',
        text: `✅ I parsed your harvest:\n\n📦 Quantity: **${qty} kg**\n⭐ Grade: **${grade}**\n📅 Date: **${dateStr}**\n\nShall I log this harvest for you? Click **"Confirm & Log"** below.`
      }]);
    } else {
      setAiMessages(prev => [...prev, {
        role: 'ai',
        text: `I couldn't detect a quantity. Try saying:\n\n"I have **500 kg** of Grade A tomatoes ready tomorrow."`
      }]);
    }
    setAiLoading(false);
  };

  const handleAIConfirm = async () => {
    if (!aiParsed || !farmer) return;
    try {
      await createHarvest({
        farmer_id: farmer.id,
        crop: 'Tomato',
        ...aiParsed,
        status: 'estimated'
      });
      setAiMessages(prev => [...prev, { role: 'ai', text: `🎉 Harvest of **${aiParsed.estimated_quantity} kg** (Grade ${aiParsed.quality_grade}) has been logged successfully!` }]);
      setAiParsed(null);
      setSuccess('Harvest logged via AI!');
      loadData();
    } catch {
      setAiMessages(prev => [...prev, { role: 'ai', text: '❌ Failed to log harvest. Please try the manual form.' }]);
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

  // Derived stats
  const totalHarvested = harvests.reduce((s, h) => s + h.estimated_quantity, 0);
  const totalSorted = harvests.reduce((s, h) => s + (h.sorted_quantity || 0), 0);
  const gradeACount = harvests.filter(h => h.quality_grade === 'A').length;

  // Mask PAN card helper
  const maskPan = (pan) => {
    if (!pan) return '—';
    return showPan ? pan : pan.substring(0, 2) + '****' + pan.substring(pan.length - 2);
  };

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
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center border-2 border-primary-50 hover:border-primary-300 transition-colors cursor-pointer"
                title="View Profile"
              >
                <span className="font-display font-bold text-primary-700">{farmer.name.charAt(0)}</span>
              </button>
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

        {/* ═══════════════════════════════════════════════════════
            HERO PROFILE HEADER — with all farmer details
        ═══════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-3xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 p-12 opacity-[0.06] pointer-events-none">
            <Sprout className="w-64 h-64 text-white transform rotate-12 translate-x-12 -translate-y-12" />
          </div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 opacity-[0.04] pointer-events-none">
            <Leaf className="w-full h-full text-primary-300 transform -translate-x-1/2 translate-y-1/2 rotate-45" />
          </div>

          <div className="relative z-10">
            {/* Top row: Name + CTA */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
              <div>
                <p className="text-stone-400 font-medium mb-1 text-sm">Welcome back,</p>
                <h1 className="font-display text-4xl font-bold text-white tracking-tight">{farmer.name}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-stone-300">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary-400" /> {farmer.location}</span>
                  <span className="flex items-center gap-1.5"><Ruler className="w-4 h-4 text-primary-400" /> {farmer.farm_size} hectares</span>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-xs font-semibold uppercase tracking-wide">
                    {farmer.producer_type === 'small' ? '🌱 Small Producer' : '🏭 Large Producer'}
                  </span>
                </div>
              </div>
              <div class="flex gap-3 flex-wrap">
                <button
                  onClick={() => setShowAIChat(true)}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/30 hover:-translate-y-1"
                >
                  <Bot className="w-5 h-5" /> AI Assistant
                </button>
                <button onClick={() => setShowHarvestForm(true)} className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary-500 text-white font-bold hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-1">
                  <Plus className="w-6 h-6" /> Log New Harvest
                </button>
              </div>
            </div>

            {/* ── Farmer Detail Cards Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* PAN Card */}
              <div className="bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/[0.12] transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">PAN Card</span>
                  </div>
                  <button
                    onClick={() => setShowPan(!showPan)}
                    className="p-1 rounded-md hover:bg-white/10 transition-colors"
                    title={showPan ? 'Hide PAN' : 'Show PAN'}
                  >
                    {showPan ? <EyeOff className="w-3.5 h-3.5 text-stone-400" /> : <Eye className="w-3.5 h-3.5 text-stone-400" />}
                  </button>
                </div>
                <p className="font-display font-bold text-lg text-white tracking-wide">{maskPan(farmer.pan_card)}</p>
                {farmer.aadhaar_last4 && (
                  <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Aadhaar: ****{farmer.aadhaar_last4}
                  </p>
                )}
              </div>

              {/* Farm Size */}
              <div className="bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/[0.12] transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Ruler className="w-4 h-4 text-primary-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Farm Size</span>
                </div>
                <p className="font-display font-bold text-2xl text-white">{farmer.farm_size} <span className="text-sm font-sans text-stone-400 font-normal">hectares</span></p>
                <p className="text-[11px] text-stone-500 mt-1">≈ {(farmer.farm_size * 2.471).toFixed(1)} acres</p>
              </div>

              {/* Land Location */}
              <div className="bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/[0.12] transition-all group sm:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <Map className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Land Location</span>
                </div>
                <p className="text-sm text-stone-200 leading-relaxed font-medium">
                  {farmer.land_location || farmer.location}
                </p>
                {farmer.phone && (
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/5">
                    <span className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Phone className="w-3 h-3 text-primary-400" /> {farmer.phone}
                    </span>
                    {farmer.email && (
                      <span className="flex items-center gap-1.5 text-xs text-stone-400">
                        <Mail className="w-3 h-3 text-primary-400" /> {farmer.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            KPI SUMMARY STRIP
        ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-card hover:shadow-card-hover transition-shadow group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Harvests</span>
            </div>
            <p className="font-display text-3xl font-bold text-stone-900">{harvests.length}</p>
            <p className="text-xs text-stone-400 mt-1">records logged</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-card hover:shadow-card-hover transition-shadow group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-sky-600" />
              </div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Yield</span>
            </div>
            <p className="font-display text-3xl font-bold text-stone-900">{totalHarvested.toLocaleString()} <span className="text-sm font-sans text-stone-400 font-normal">kg</span></p>
            <p className="text-xs text-stone-400 mt-1">estimated total</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-card hover:shadow-card-hover transition-shadow group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Sorted</span>
            </div>
            <p className="font-display text-3xl font-bold text-stone-900">{totalSorted.toLocaleString()} <span className="text-sm font-sans text-stone-400 font-normal">kg</span></p>
            <p className="text-xs text-stone-400 mt-1">post-sorting yield</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-card hover:shadow-card-hover transition-shadow group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Grade A</span>
            </div>
            <p className="font-display text-3xl font-bold text-stone-900">{gradeACount} <span className="text-sm font-sans text-stone-400 font-normal">/ {harvests.length}</span></p>
            <p className="text-xs text-stone-400 mt-1">premium quality</p>
          </div>
        </div>


        {/* ═══════════════════════════════════════════════════════
            2-COLUMN LAYOUT: Harvest History + Action Center
        ═══════════════════════════════════════════════════════ */}
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
                            {h.estimated_quantity.toLocaleString()} <span className="text-xs font-sans text-stone-500 font-normal">kg</span>
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

          {/* Right Column: Action Center */}
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

      {/* ═══════════════════════════════════════════════════════
          FULL PROFILE MODAL — Detailed farmer info
      ═══════════════════════════════════════════════════════ */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg mx-4 shadow-2xl animate-scale-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 p-8 relative">
              <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 text-2xl font-display font-bold text-white">
                  {farmer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">{farmer.name}</h2>
                  <p className="text-stone-400 text-sm mt-0.5">{farmer.producer_type === 'small' ? 'Small Producer' : 'Large Producer'} • {farmer.location}</p>
                </div>
              </div>
            </div>

            {/* Detail Cards */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* PAN Card */}
              <div className="flex items-start gap-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-0.5">PAN Card Number</p>
                  <p className="text-lg font-display font-bold text-stone-900 tracking-wider">{farmer.pan_card || '—'}</p>
                </div>
              </div>

              {/* Farm Size */}
              <div className="flex items-start gap-4 p-4 bg-primary-50/50 border border-primary-100 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Ruler className="w-5 h-5 text-primary-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-primary-700 uppercase tracking-wider mb-0.5">Farming Size</p>
                  <p className="text-lg font-display font-bold text-stone-900">{farmer.farm_size} hectares <span className="text-sm font-sans text-stone-400 font-normal">({(farmer.farm_size * 2.471).toFixed(1)} acres)</span></p>
                </div>
              </div>

              {/* Land Location */}
              <div className="flex items-start gap-4 p-4 bg-sky-50/50 border border-sky-100 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <Map className="w-5 h-5 text-sky-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-0.5">Land Location</p>
                  <p className="text-sm font-medium text-stone-700 leading-relaxed">{farmer.land_location || farmer.location}</p>
                </div>
              </div>

              {/* Aadhaar Verification */}
              {farmer.aadhaar_last4 && (
                <div className="flex items-start gap-4 p-4 bg-violet-50/50 border border-violet-100 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-violet-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-0.5">Aadhaar Verification</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-display font-bold text-stone-900 tracking-widest">XXXX XXXX {farmer.aadhaar_last4}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold uppercase">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="flex items-start gap-4 p-4 bg-stone-50 border border-stone-100 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-stone-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Contact Details</p>
                  {farmer.phone && (
                    <div className="flex items-center gap-2 text-sm text-stone-700">
                      <Phone className="w-4 h-4 text-stone-400" />
                      <span className="font-medium">+91 {farmer.phone}</span>
                    </div>
                  )}
                  {farmer.email && (
                    <div className="flex items-center gap-2 text-sm text-stone-700">
                      <Mail className="w-4 h-4 text-stone-400" />
                      <span className="font-medium">{farmer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
              <button onClick={() => setShowProfileModal(false)} className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 transition-colors shadow-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          LOG HARVEST MODAL
      ═══════════════════════════════════════════════════════ */}
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

      {/* ═══ AI HARVEST CHAT MODAL ═══ */}
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
                  <p className="text-violet-200 text-xs">Describe your harvest in plain English</p>
                </div>
              </div>
              <button onClick={() => setShowAIChat(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-violet-600" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
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
                    <span className="text-stone-400 text-sm">Parsing your harvest...</span>
                  </div>
                </div>
              )}
              {aiParsed && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 mr-2 flex-shrink-0" />
                  <button
                    onClick={handleAIConfirm}
                    className="px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors shadow-md"
                  >
                    ✅ Confirm & Log Harvest
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
                  placeholder="e.g. I have 400 kg Grade A tomatoes for tomorrow..."
                />
                <button
                  onClick={handleAISend}
                  disabled={aiLoading || !aiInput.trim()}
                  className="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
