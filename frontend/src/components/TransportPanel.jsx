import React, { useState, useEffect } from 'react';
import {
  Bot, Truck, CheckCircle, AlertCircle, RefreshCw, ChevronDown,
  ChevronUp, IndianRupee, Package, Zap, Send, Loader, Info
} from 'lucide-react';
import { getTransportRecommendation, getTransportAlternatives, recommendTransport } from '../services/api';

export default function TransportPanel({ orderId, onStatusChange }) {
  const [recommendation, setRecommendation] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAlts, setShowAlts] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecommendation = async () => {
    if (!orderId) return;
    try {
      const res = await getTransportRecommendation(orderId);
      setRecommendation(res.data);
      setError(null);
    } catch (e) {
      if (e.response?.status !== 404) {
        setError('Could not load transport recommendation.');
      }
    }
  };

  useEffect(() => {
    fetchRecommendation();
  }, [orderId]);

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      await recommendTransport(orderId);
      await fetchRecommendation();
      if (onStatusChange) onStatusChange();
    } catch (e) {
      setError('No valid truck combination found. Check truck availability.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAlternatives = async () => {
    if (showAlts) { setShowAlts(false); return; }
    try {
      const res = await getTransportAlternatives(orderId);
      setAlternatives(res.data.alternatives || []);
      setShowAlts(true);
    } catch (e) {
      setAlternatives([]);
      setShowAlts(true);
    }
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim() || !recommendation) return;
    setAiLoading(true);
    // Intelligent rule-based answers using actual data
    const q = aiQuestion.toLowerCase();
    const rec = recommendation;
    let answer = '';

    await new Promise(r => setTimeout(r, 800));

    if (q.includes('cost') || q.includes('cheap') || q.includes('reduce')) {
      answer = `The current estimated cost is ₹${rec.total_cost?.toLocaleString()}. ` +
        `This uses ${rec.trucks_count} truck(s) for ${rec.allocated_capacity} kg capacity. ` +
        `To reduce cost, you could try using fewer trucks if the required quantity is flexible. ` +
        `Click "View Alternatives" to compare options.`;
    } else if (q.includes('why') || q.includes('reason') || q.includes('select')) {
      answer = rec.reason || 'This combination was selected by the optimization engine as the minimum-cost plan that satisfies the required quantity.';
    } else if (q.includes('unavailable') || q.includes('what if')) {
      answer = `If a truck becomes unavailable, click "Recalculate" and the AI will generate a new optimized plan using only the currently available trucks.`;
    } else if (q.includes('alternative') || q.includes('option') || q.includes('another')) {
      answer = `Click "View Alternatives" below to see up to 3 alternative truck combinations with different cost/capacity tradeoffs.`;
    } else if (q.includes('truck') || q.includes('how many')) {
      answer = `${rec.trucks_count} truck(s) are assigned: ${rec.trucks?.map(t => `${t.vehicle_number} (${t.assigned_capacity} kg, ₹${t.cost})`).join(', ')}.`;
    } else if (q.includes('capacity') || q.includes('surplus')) {
      const unused = (rec.allocated_capacity - rec.required_quantity) || 0;
      answer = `Total allocated capacity: ${rec.allocated_capacity} kg. Required: ${rec.required_quantity} kg. ` +
        (unused > 0 ? `Unused/surplus: ${unused} kg.` : `This is an exact match with no wasted capacity!`);
    } else {
      answer = `I can answer questions about: cost, truck selection reason, available alternatives, capacity details, and what-if scenarios. Try asking "Why did you choose these trucks?" or "Can I reduce the cost?"`;
    }
    setAiAnswer(answer);
    setAiLoading(false);
  };

  const statusColor = {
    assigned: 'bg-sky-50 text-sky-700 border-sky-100',
    picking_up: 'bg-amber-50 text-amber-700 border-amber-100',
    in_transit: 'bg-violet-50 text-violet-700 border-violet-100',
    delivered: 'bg-primary-50 text-primary-700 border-primary-100',
  };

  if (!orderId) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-violet-900 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">AI Transport Assistant</h3>
            <p className="text-violet-200 text-xs">Order #{orderId} — Real-time allocation</p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!recommendation && !error && (
          <div className="text-center py-8 text-stone-400">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Transport recommendation will appear here once the farmer accepts the request.</p>
          </div>
        )}

        {recommendation && (
          <>
            {/* Recommended Plan */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-bold text-stone-900">Recommended Plan</span>
              </div>
              <div className="space-y-2">
                {recommendation.trucks?.map((t, i) => (
                  <div key={t.vehicle_id || i} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-4 h-4 text-violet-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900 text-sm font-mono">{t.vehicle_number}</p>
                      {t.driver_name && (
                        <p className="text-xs text-stone-700 font-semibold">Driver: <span className="text-violet-700">{t.driver_name}</span></p>
                      )}
                      {t.driver_contact && (
                        <p className="text-[11px] text-stone-500 font-mono">📞 +91 {t.driver_contact}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-stone-900 text-sm">{t.assigned_capacity} kg</p>
                      <p className="text-xs text-stone-500">₹{t.cost?.toLocaleString()}</p>
                    </div>
                    {t.status && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor[t.status] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                        {t.status?.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-violet-50 rounded-xl p-3 text-center">
                <p className="text-xs text-violet-600 font-bold uppercase tracking-wide mb-1">Capacity</p>
                <p className="font-display font-bold text-violet-900 text-lg">{recommendation.allocated_capacity} <span className="text-xs font-normal">kg</span></p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide mb-1">Total Cost</p>
                <p className="font-display font-bold text-emerald-900 text-lg">₹{recommendation.total_cost?.toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wide mb-1">Trucks</p>
                <p className="font-display font-bold text-amber-900 text-lg">{recommendation.trucks_count}</p>
              </div>
            </div>

            {/* Unused Capacity */}
            {recommendation.unused_capacity !== undefined && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-4 ${
                recommendation.unused_capacity === 0
                  ? 'bg-primary-50 text-primary-700 border border-primary-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                <Info className="w-4 h-4 flex-shrink-0" />
                {recommendation.unused_capacity === 0
                  ? '✅ Exact match — zero wasted capacity!'
                  : `⚠️ Unused capacity: ${recommendation.unused_capacity} kg (nearest valid combination)`}
              </div>
            )}

            {/* Reason */}
            {recommendation.reason && (
              <div className="bg-stone-50 rounded-xl p-4 mb-4 border border-stone-100">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Why this plan?</p>
                <p className="text-sm text-stone-700 leading-relaxed">{recommendation.reason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleViewAlternatives}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {showAlts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAlts ? 'Hide' : 'View'} Alternatives
              </button>
            </div>

            {/* Alternatives */}
            {showAlts && (
              <div className="mb-4 space-y-3">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Alternative Plans</p>
                {alternatives.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-4">No valid alternatives found.</p>
                ) : (
                  alternatives.map((alt, i) => (
                    <div key={i} className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-stone-600">Option {i + 1}</span>
                        <div className="flex gap-3 text-xs text-stone-500">
                          <span>{alt.trucks_count} trucks</span>
                          <span>{alt.total_capacity} kg</span>
                          <span className="font-bold text-stone-800">₹{alt.total_cost?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {alt.trucks?.map((t, j) => (
                          <span key={j} className="px-2 py-0.5 bg-white border border-stone-200 rounded-full text-xs text-stone-700">
                            {t.vehicle_number} ({t.assigned_capacity} kg)
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-stone-500 mt-2">{alt.reason}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Ask AI */}
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" /> Ask AI
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none"
                  placeholder="e.g. Why these trucks? Can I reduce cost?"
                />
                <button
                  onClick={handleAskAI}
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-40"
                >
                  {aiLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {aiAnswer && (
                <div className="mt-3 p-3 bg-violet-50 rounded-xl border border-violet-100 text-sm text-violet-800">
                  {aiAnswer}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
