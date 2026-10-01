import React, { useEffect, useState } from 'react';
import { getFarmers, createFarmer, getHarvests, createHarvest, updateHarvest, parseHarvest } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit3, Sprout, MessageSquare, X, User, MapPin, Ruler, Tag } from 'lucide-react';

export default function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFarmerForm, setShowFarmerForm] = useState(false);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [showNLInput, setShowNLInput] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState(null);
  const [nlText, setNlText] = useState('');
  const [nlFarmerId, setNlFarmerId] = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const [nlResult, setNlResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [farmerForm, setFarmerForm] = useState({ name: '', location: '', farm_size: '', producer_type: 'small' });
  const [harvestForm, setHarvestForm] = useState({
    farmer_id: '', crop: 'Tomato', estimated_quantity: '', sorted_quantity: '',
    quality_grade: 'A', harvest_date: new Date().toISOString().split('T')[0], status: 'estimated',
  });
  const [updateForm, setUpdateForm] = useState({ sorted_quantity: '', quality_grade: '', status: 'sorted' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [f, h] = await Promise.all([getFarmers(), getHarvests()]);
      setFarmers(f.data);
      setHarvests(h.data);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  };

  const handleCreateFarmer = async (e) => {
    e.preventDefault();
    try {
      await createFarmer({ ...farmerForm, farm_size: parseFloat(farmerForm.farm_size) });
      setShowFarmerForm(false);
      setFarmerForm({ name: '', location: '', farm_size: '', producer_type: 'small' });
      setSuccess('Farmer registered successfully!');
      loadData();
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create farmer.'); }
  };

  const handleCreateHarvest = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...harvestForm,
        farmer_id: parseInt(harvestForm.farmer_id),
        estimated_quantity: parseFloat(harvestForm.estimated_quantity),
        sorted_quantity: harvestForm.sorted_quantity ? parseFloat(harvestForm.sorted_quantity) : null,
      };
      await createHarvest(data);
      setShowHarvestForm(false);
      setHarvestForm({ farmer_id: '', crop: 'Tomato', estimated_quantity: '', sorted_quantity: '', quality_grade: 'A', harvest_date: new Date().toISOString().split('T')[0], status: 'estimated' });
      setSuccess('Harvest added successfully!');
      loadData();
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create harvest.'); }
  };

  const handleUpdateHarvest = async (e) => {
    e.preventDefault();
    try {
      const data = {};
      if (updateForm.sorted_quantity) data.sorted_quantity = parseFloat(updateForm.sorted_quantity);
      if (updateForm.quality_grade) data.quality_grade = updateForm.quality_grade;
      data.status = 'sorted';
      await updateHarvest(editingHarvest.id, data);
      setEditingHarvest(null);
      setSuccess('Harvest updated after sorting!');
      loadData();
    } catch (err) { setError(err.response?.data?.detail || 'Failed to update harvest.'); }
  };

  const handleNLParse = async () => {
    if (!nlText.trim() || !nlFarmerId) return;
    try {
      setNlParsing(true);
      const res = await parseHarvest({ text: nlText, farmer_id: parseInt(nlFarmerId) });
      setNlResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'AI could not parse the input. Please use the manual form.');
    } finally { setNlParsing(false); }
  };

  const applyNLResult = () => {
    if (!nlResult?.parsed) return;
    const p = nlResult.parsed;
    setHarvestForm({
      ...harvestForm,
      farmer_id: nlFarmerId,
      estimated_quantity: p.estimated_quantity?.toString() || '',
      sorted_quantity: p.expected_sorted_quantity?.toString() || '',
      quality_grade: p.quality_grade || 'A',
    });
    setShowNLInput(false);
    setShowHarvestForm(true);
    setNlResult(null);
    setNlText('');
  };

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  if (loading) return <LoadingSpinner message="Loading farmers..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="farmers-page">
      {/* Notifications */}
      {success && <div className="mb-4 p-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm animate-slide-up">{success}</div>}
      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-slide-up">{error}</div>}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900">Farmers & Harvests</h1>
          <p className="text-stone-500 mt-1">Manage farmer profiles and harvest entries.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowNLInput(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary-200 text-primary-700 font-medium text-sm hover:bg-primary-50 transition-colors" id="btn-nl-input">
            <MessageSquare className="w-4 h-4" /> AI Input
          </button>
          <button onClick={() => setShowFarmerForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors shadow-sm" id="btn-add-farmer">
            <Plus className="w-4 h-4" /> Add Farmer
          </button>
          <button onClick={() => setShowHarvestForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-harvest-600 text-white font-medium text-sm hover:bg-harvest-700 transition-colors shadow-sm" id="btn-add-harvest">
            <Sprout className="w-4 h-4" /> Add Harvest
          </button>
        </div>
      </div>

      {/* NL Input Modal */}
      {showNLInput && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" id="nl-modal">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-stone-900">🤖 AI Harvest Input</h2>
              <button onClick={() => { setShowNLInput(false); setNlResult(null); }} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Select Farmer</label>
              <select value={nlFarmerId} onChange={(e) => setNlFarmerId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                <option value="">Choose farmer...</option>
                {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Describe your harvest naturally</label>
              <textarea value={nlText} onChange={(e) => setNlText(e.target.value)} rows={4}
                placeholder='e.g. "I have around 400 kg Grade A tomatoes ready tomorrow morning, but after sorting I expect around 330 kg."'
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
              />
            </div>
            {nlResult && (
              <div className="mb-4 p-4 rounded-xl bg-primary-50 border border-primary-100">
                <p className="text-sm font-semibold text-primary-800 mb-2">Parsed Result:</p>
                <div className="text-sm text-primary-700 space-y-1">
                  <p>Estimated: {nlResult.parsed.estimated_quantity}</p>
                  {nlResult.parsed.expected_sorted_quantity && <p>After sorting: {nlResult.parsed.expected_sorted_quantity}</p>}
                  <p>Quality: Grade {nlResult.parsed.quality_grade}</p>
                  {nlResult.parsed.availability && <p>Available: {nlResult.parsed.availability}</p>}
                </div>
                <button onClick={applyNLResult} className="mt-3 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
                  Use This Data
                </button>
              </div>
            )}
            <button onClick={handleNLParse} disabled={nlParsing || !nlText.trim() || !nlFarmerId}
              className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {nlParsing ? 'Parsing...' : 'Parse with AI'}
            </button>
          </div>
        </div>
      )}

      {/* Farmer Form Modal */}
      {showFarmerForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-stone-900">Register Farmer</h2>
              <button onClick={() => setShowFarmerForm(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateFarmer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5"><User className="w-3.5 h-3.5 inline mr-1" />Name</label>
                <input type="text" required value={farmerForm.name} onChange={(e) => setFarmerForm({...farmerForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="Farmer name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Location</label>
                <input type="text" required value={farmerForm.location} onChange={(e) => setFarmerForm({...farmerForm, location: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="Farm location" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5"><Ruler className="w-3.5 h-3.5 inline mr-1" />Farm Size (ha)</label>
                  <input type="number" step="0.1" min="0.1" required value={farmerForm.farm_size} onChange={(e) => setFarmerForm({...farmerForm, farm_size: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5"><Tag className="w-3.5 h-3.5 inline mr-1" />Producer Type</label>
                  <select value={farmerForm.producer_type} onChange={(e) => setFarmerForm({...farmerForm, producer_type: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                    <option value="small">Small</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors">Register Farmer</button>
            </form>
          </div>
        </div>
      )}

      {/* Harvest Form Modal */}
      {showHarvestForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-stone-900">Add Harvest</h2>
              <button onClick={() => setShowHarvestForm(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateHarvest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Farmer</label>
                <select required value={harvestForm.farmer_id} onChange={(e) => setHarvestForm({...harvestForm, farmer_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                  <option value="">Select farmer...</option>
                  {farmers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.producer_type})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Estimated Qty</label>
                  <input type="number" step="0.1" min="0.1" required value={harvestForm.estimated_quantity} onChange={(e) => setHarvestForm({...harvestForm, estimated_quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Sorted Qty</label>
                  <input type="number" step="0.1" min="0" value={harvestForm.sorted_quantity} onChange={(e) => setHarvestForm({...harvestForm, sorted_quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-harvest-600 text-white font-medium hover:bg-harvest-700 transition-colors">Save Harvest</button>
            </form>
          </div>
        </div>
      )}

      {/* Update Harvest Modal */}
      {editingHarvest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-stone-900">Update After Sorting</h2>
              <button onClick={() => setEditingHarvest(null)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-stone-50 text-sm text-stone-600">
              <p><strong>{editingHarvest.farmer_name}</strong> — Estimated: {editingHarvest.estimated_quantity} kg, Grade {editingHarvest.quality_grade}</p>
            </div>
            <form onSubmit={handleUpdateHarvest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Actual Sorted Quantity (kg)</label>
                <input type="number" step="0.1" min="0" required value={updateForm.sorted_quantity} onChange={(e) => setUpdateForm({...updateForm, sorted_quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="Quantity after sorting" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Quality Grade (if changed)</label>
                <select value={updateForm.quality_grade} onChange={(e) => setUpdateForm({...updateForm, quality_grade: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                  <option value="">Keep current</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors">Update Harvest</button>
            </form>
          </div>
        </div>
      )}

      {/* Farmers Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-card overflow-hidden mb-8" id="farmers-table">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-display font-semibold text-stone-900">Registered Farmers</h2>
        </div>
        {farmers.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <User className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No farmers registered yet. Add a farmer to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-500 uppercase tracking-wider">Farm Size (ha)</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {farmers.map((f) => (
                  <tr key={f.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-stone-900">{f.name}</td>
                    <td className="px-6 py-4 text-stone-600">{f.location}</td>
                    <td className="px-6 py-4 text-right text-stone-700">{f.farm_size}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${f.producer_type === 'small' ? 'bg-primary-50 text-primary-700' : 'bg-harvest-50 text-harvest-700'}`}>
                        {f.producer_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Harvests Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-card overflow-hidden" id="harvests-table">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-display font-semibold text-stone-900">Current Harvests</h2>
        </div>
        {harvests.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <Sprout className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No harvests recorded yet. Add a harvest to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Farmer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-500 uppercase tracking-wider">Estimated</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-500 uppercase tracking-wider">Sorted</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {harvests.map((h) => (
                  <tr key={h.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-stone-900">{h.farmer_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${h.producer_type === 'small' ? 'bg-primary-50 text-primary-700' : 'bg-harvest-50 text-harvest-700'}`}>
                        {h.producer_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-stone-700">{h.estimated_quantity}</td>
                    <td className="px-6 py-4 text-right">
                      {h.sorted_quantity != null ? (
                        <span className="text-primary-700 font-medium">{h.sorted_quantity}</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                        h.quality_grade === 'A' ? 'bg-primary-50 text-primary-700' :
                        h.quality_grade === 'B' ? 'bg-harvest-50 text-harvest-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>{h.quality_grade}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        h.status === 'sorted' ? 'bg-sky-50 text-sky-700' :
                        h.status === 'allocated' ? 'bg-primary-50 text-primary-700' :
                        'bg-stone-100 text-stone-600'
                      }`}>{h.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-stone-500">{h.harvest_date}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => { setEditingHarvest(h); setUpdateForm({ sorted_quantity: '', quality_grade: '', status: 'sorted' }); }}
                        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-sky-600 transition-colors"
                        title="Update after sorting"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
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
