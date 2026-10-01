import React, { useState } from 'react';
import { runAIMatch, askWhatIf } from '../services/api';
import { Brain, Zap, TrendingUp, Truck, ShoppingCart, Sprout, Users, MessageSquare, Send, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';

export default function AICoordination() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [whatIfQ, setWhatIfQ] = useState('');
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setWhatIfResult(null);
      const res = await runAIMatch();
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'AI recommendation is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatIf = async () => {
    if (!whatIfQ.trim()) return;
    try {
      setWhatIfLoading(true);
      const res = await askWhatIf({ question: whatIfQ });
      setWhatIfResult(res.data);
    } catch (err) {
      setWhatIfResult({ question: whatIfQ, analysis: 'AI analysis is temporarily unavailable.', impact_summary: 'Could not determine impact.' });
    } finally {
      setWhatIfLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="coordination-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-stone-900">AI Coordination Center</h1>
            <p className="text-stone-500 text-sm">Generate intelligent collection and allocation plans.</p>
          </div>
        </div>
      </div>

      {/* Summary Cards (show if result exists) */}
      {result && (
        <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-in">
          <div className="bg-primary-50 rounded-xl border border-primary-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Sprout className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-semibold text-primary-700 uppercase tracking-wider">Available Supply</span>
            </div>
            <p className="text-2xl font-display font-bold text-primary-800">{result.total_supply} <span className="text-sm font-normal">kg</span></p>
          </div>
          <div className="bg-harvest-50 rounded-xl border border-harvest-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-harvest-600" />
              <span className="text-xs font-semibold text-harvest-700 uppercase tracking-wider">Buyer Demand</span>
            </div>
            <p className="text-2xl font-display font-bold text-harvest-800">{result.total_demand} <span className="text-sm font-normal">kg</span></p>
          </div>
          <div className="bg-violet-50 rounded-xl border border-violet-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wider">Transport Capacity</span>
            </div>
            <p className="text-2xl font-display font-bold text-violet-800">{result.transport_capacity} <span className="text-sm font-normal">kg</span></p>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="mb-8">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="group w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl gradient-primary text-white font-semibold text-base hover:opacity-95 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          id="btn-generate-plan"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing data...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Generate Collection Plan
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-slide-up">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Unable to generate recommendation</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-slide-up">
          {/* Method Badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              result.method === 'ai' ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'
            }`}>
              {result.method === 'ai' ? <Brain className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
              {result.method === 'ai' ? 'AI-Enhanced Recommendation' : 'Rule-Based Recommendation'}
            </span>
          </div>

          {/* Allocation Plan */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-card overflow-hidden" id="allocation-plan">
            <div className="px-6 py-4 border-b border-stone-100 bg-gradient-to-r from-primary-50 to-transparent">
              <h2 className="font-display text-lg font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Recommended Collection Plan
              </h2>
            </div>
            {result.allocations.length === 0 ? (
              <div className="p-8 text-center text-stone-400">
                <p>No allocations could be made with the current data.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {result.allocations.map((a, i) => (
                  <div key={i} className="px-6 py-4 hover:bg-stone-50/50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                        <span className="font-display font-bold text-primary-700 text-sm">{a.collection_slot?.replace('Slot ', 'S') || `S${i+1}`}</span>
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">
                          {a.farmer_name} → {a.buyer_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${a.producer_type === 'small' ? 'bg-primary-50 text-primary-600' : 'bg-harvest-50 text-harvest-600'}`}>
                            {a.producer_type}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            a.quality_grade === 'A' ? 'bg-primary-50 text-primary-600' : 'bg-harvest-50 text-harvest-600'
                          }`}>Grade {a.quality_grade}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-display font-bold text-stone-900">{a.quantity} <span className="text-sm font-normal text-stone-400">kg</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Summary bar */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 grid grid-cols-4 gap-4 text-center text-sm">
              <div>
                <p className="text-stone-500">Allocated</p>
                <p className="font-bold text-primary-700">{result.total_allocated} kg</p>
              </div>
              <div>
                <p className="text-stone-500">Transport Used</p>
                <p className="font-bold text-violet-700">{result.transport_used}/{result.transport_capacity} kg</p>
              </div>
              <div>
                <p className="text-stone-500">Unallocated Supply</p>
                <p className="font-bold text-harvest-600">{result.unallocated_supply} kg</p>
              </div>
              <div>
                <p className="text-stone-500">Unmet Demand</p>
                <p className="font-bold text-rose-600">{result.unmet_demand} kg</p>
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-card p-6" id="ai-explanation">
            <h3 className="font-display font-semibold text-stone-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-harvest-500" />
              Why This Plan?
            </h3>
            <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50 rounded-lg p-4 border border-stone-100">
              {result.explanation}
            </div>
          </div>

          {/* Fairness Panel */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-card p-6" id="coordination-fairness">
            <h3 className="font-display font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              Collection Access & Fairness
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-stone-600">Small Producers</p>
                  <p className="font-semibold text-primary-700">{result.small_producers_included} / {result.total_small_producers}</p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-stone-600">Large Producers</p>
                  <p className="font-semibold text-harvest-700">{result.large_producers_included} / {result.total_large_producers}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-stone-600">Total Collection Slots</p>
                  <p className="font-semibold text-stone-900">{result.allocations.length}</p>
                </div>
              </div>
              <div className="space-y-2">
                {result.fairness_notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <span className="text-stone-600">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* What-If Section */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-card p-6" id="what-if-section">
            <h3 className="font-display font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-500" />
              What-If Analysis
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={whatIfQ}
                onChange={(e) => setWhatIfQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleWhatIf()}
                placeholder='e.g. "What if Farm B provides only 150 kg?" or "What if transport capacity decreases by 200 kg?"'
                className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                id="what-if-input"
              />
              <button
                onClick={handleWhatIf}
                disabled={whatIfLoading || !whatIfQ.trim()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                id="btn-what-if"
              >
                {whatIfLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Ask
              </button>
            </div>

            {whatIfResult && (
              <div className="mt-4 animate-slide-up">
                <div className="bg-violet-50 rounded-lg border border-violet-100 p-4">
                  <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">Impact Summary</p>
                  <p className="text-sm font-medium text-violet-900 mb-3">{whatIfResult.impact_summary}</p>
                  <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">Detailed Analysis</p>
                  <p className="text-sm text-violet-800 whitespace-pre-line">{whatIfResult.analysis}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no result yet */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-card p-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-glow">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-stone-900 mb-3">Ready to Coordinate</h2>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Click <strong>"Generate Collection Plan"</strong> to analyze current supply, demand, and transport data
            and generate an AI-powered allocation recommendation.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1"><Sprout className="w-3.5 h-3.5" /> Supply</span>
            <span>+</span>
            <span className="flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Demand</span>
            <span>+</span>
            <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Transport</span>
            <span>+</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Fairness</span>
            <span>=</span>
            <span className="flex items-center gap-1 text-primary-600 font-semibold"><Brain className="w-3.5 h-3.5" /> AI Plan</span>
          </div>
        </div>
      )}
    </div>
  );
}
