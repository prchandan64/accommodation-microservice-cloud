import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Wind,
  Shield,
  Check,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

interface RecommendationResult {
  inventory_id: string;
  hostel_name: string;
  room_type_name: string;
  rent_amount: number;
  matchScore: number;
  reason: string;
  is_ac: boolean;
  has_attached_bathroom: boolean;
  available_beds: number;
}

export const RoomRecommender: React.FC<{ onSelectRoom: (inventoryId: string) => void }> = ({ onSelectRoom }) => {
  const { inventories } = useApp();
  const [maxBudget, setMaxBudget] = useState<number>(55000);
  const [needAc, setNeedAc] = useState<boolean>(true);
  const [needAttachedBath, setNeedAttachedBath] = useState<boolean>(true);
  const [privacyPreference, setPrivacyPreference] = useState<'SINGLE' | 'ANY'>('ANY');

  // Client-side heuristic ranking over real backend /availability results
  const getRecommendations = (): RecommendationResult[] => {
    return inventories
      .map((inv) => {
        let score = 70;
        const reasons: string[] = [];

        // Budget match
        if (inv.rent_amount <= maxBudget) {
          score += 15;
          reasons.push(`Well within budget (₹${inv.rent_amount.toLocaleString('en-IN')})`);
        } else {
          score -= 20;
        }

        // AC match
        if (needAc && inv.is_ac) {
          score += 10;
          reasons.push('Features Inverter AC');
        } else if (needAc && !inv.is_ac) {
          score -= 10;
        }

        // Bathroom match
        if (needAttachedBath && inv.has_attached_bathroom) {
          score += 10;
          reasons.push('Private attached washroom');
        }

        // Privacy match
        if (privacyPreference === 'SINGLE' && inv.room_type_name.toLowerCase().includes('single')) {
          score += 15;
          reasons.push('100% single occupancy privacy');
        }

        // High availability bonus
        if (inv.beds_available > 5) {
          score += 5;
        }

        const finalScore = Math.min(99, Math.max(45, score));

        return {
          inventory_id: inv.inventory_id,
          hostel_name: inv.hostel_name,
          room_type_name: inv.room_type_name,
          rent_amount: inv.rent_amount,
          matchScore: finalScore,
          reason: reasons.length > 0 ? reasons.join(' • ') : 'Good overall fit for your student cohort',
          is_ac: inv.is_ac,
          has_attached_bathroom: inv.has_attached_bathroom,
          available_beds: inv.beds_available
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  };

  const recommendations = getRecommendations();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-lg text-slate-900">AI Room Recommender</h3>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Multi-criteria Ranking</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Personalized room matching based on your lifestyle, study habits, and budget.
            </p>
          </div>
        </div>
      </div>

      {/* Input Form Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        {/* Budget Slider */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Max Semester Budget: <span className="text-emerald-700 font-mono">₹{maxBudget.toLocaleString('en-IN')}</span>
          </label>
          <input
            type="range"
            min="25000"
            max="75000"
            step="2000"
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>₹25,000</span>
            <span>₹75,000</span>
          </div>
        </div>

        {/* AC Preference */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Climate Control
          </label>
          <button
            onClick={() => setNeedAc(!needAc)}
            className={`w-full py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition ${
              needAc
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Wind className="w-4 h-4 text-emerald-600" />
              <span>Require Split AC</span>
            </div>
            {needAc && <Check className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>

        {/* Attached Bath */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Bathroom Setup
          </label>
          <button
            onClick={() => setNeedAttachedBath(!needAttachedBath)}
            className={`w-full py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition ${
              needAttachedBath
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Attached Bath</span>
            </div>
            {needAttachedBath && <Check className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>

        {/* Privacy Level */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Privacy Preference
          </label>
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-white">
            <button
              onClick={() => setPrivacyPreference('ANY')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                privacyPreference === 'ANY'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Any Sharing
            </button>
            <button
              onClick={() => setPrivacyPreference('SINGLE')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                privacyPreference === 'SINGLE'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Only
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Rooms Carousel / Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
          <span>Top AI Matches Ranked for You</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((item, idx) => (
            <div
              key={item.inventory_id}
              className={`relative rounded-xl border p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                idx === 0
                  ? 'bg-gradient-to-br from-purple-50/60 to-white border-purple-300 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              {idx === 0 && (
                <div className="absolute -top-2.5 right-3 bg-purple-700 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow">
                  Top Recommended
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-500">{item.hostel_name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-xs font-bold">
                    {item.matchScore}% Match
                  </span>
                </div>
                <h5 className="font-bold text-slate-900 text-sm mb-2">{item.room_type_name}</h5>
                <div className="text-xs text-purple-900/80 bg-purple-50/80 p-2 rounded-lg border border-purple-100 mb-3">
                  <span className="font-semibold">Why this pick:</span> {item.reason}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-3 pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-400">Semester Rent</span>
                  <span className="font-mono font-bold text-slate-900 text-base">
                    ₹{item.rent_amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  onClick={() => onSelectRoom(item.inventory_id)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition shadow-sm"
                >
                  <span>Select & Hold Bed</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
