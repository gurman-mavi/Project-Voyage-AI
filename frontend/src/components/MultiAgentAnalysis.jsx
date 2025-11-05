import { useState } from 'react';

export default function MultiAgentAnalysis({ tripData, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function runAnalysis() {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/multi-agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData)
      });

      if (!res.ok) throw new Error('Analysis failed');

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">🤖 Multi-Agent Analysis</h2>
              <p className="text-sm text-neutral-600 mt-1">AI agents collaborating to optimize your trip</p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result && !loading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-6">
                <span className="text-4xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to Analyze Your Trip</h3>
              <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                Our AI agents will analyze your budget, weather conditions, and activities to create an optimized travel plan.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                <AgentCard icon="💰" name="Budget Agent" desc="Cost optimization" />
                <AgentCard icon="🌤️" name="Weather Agent" desc="Forecast analysis" />
                <AgentCard icon="🎯" name="Activity Agent" desc="Experience curation" />
                <AgentCard icon="🎭" name="Coordinator" desc="Unified planning" />
              </div>
              <button
                onClick={runAnalysis}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg transition"
              >
                Start Analysis
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-flex flex-col items-center">
                {/* Travel-themed animation */}
                <div className="relative w-32 h-32 mb-6">
                  {/* Airplane circling */}
                  <div className="absolute inset-0 animate-spin-slow">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 text-4xl">✈️</div>
                  </div>
                  {/* Globe in center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl animate-pulse">🌍</div>
                  </div>
                  {/* Orbiting dots */}
                  <div className="absolute inset-0 animate-spin">
                    <div className="absolute top-0 left-1/2 w-2 h-2 bg-indigo-500 rounded-full -translate-x-1/2"></div>
                  </div>
                  <div className="absolute inset-0 animate-spin-reverse">
                    <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-purple-500 rounded-full -translate-x-1/2"></div>
                  </div>
                </div>
                
                <p className="text-xl font-bold text-neutral-900 mb-4">AI Agents Analyzing Your Trip</p>
                <div className="space-y-3 text-sm text-neutral-600 max-w-md">
                  <div className="flex items-center gap-3 bg-green-50 rounded-lg px-4 py-2 animate-slideIn">
                    <span className="text-2xl">💰</span>
                    <span className="font-medium">Budget Agent optimizing costs...</span>
                  </div>
                  <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-2 animate-slideIn" style={{animationDelay: '0.2s'}}>
                    <span className="text-2xl">🌤️</span>
                    <span className="font-medium">Weather Agent checking forecasts...</span>
                  </div>
                  <div className="flex items-center gap-3 bg-purple-50 rounded-lg px-4 py-2 animate-slideIn" style={{animationDelay: '0.4s'}}>
                    <span className="text-2xl">🎯</span>
                    <span className="font-medium">Activity Agent curating experiences...</span>
                  </div>
                  <div className="flex items-center gap-3 bg-indigo-50 rounded-lg px-4 py-2 animate-slideIn" style={{animationDelay: '0.6s'}}>
                    <span className="text-2xl">🎭</span>
                    <span className="font-medium">Coordinator synthesizing insights...</span>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-rose-700 mb-2">Analysis Failed</h3>
              <p className="text-neutral-600 mb-6">{error}</p>
              <button
                onClick={runAnalysis}
                className="px-6 py-2 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {result && result.success && (
            <div className="space-y-6">
              {/* Coordinator's Unified Plan */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🎭</span>
                  <h3 className="text-lg font-bold text-neutral-900">Coordinator's Unified Plan</h3>
                </div>
                <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
                  {result.agents.coordinator?.unifiedPlan}
                </div>
              </div>

              {/* Budget Agent */}
              <AgentResult
                icon="💰"
                name="Budget Agent"
                color="green"
                analysis={result.agents.budget?.analysis}
                metrics={result.agents.budget?.metrics}
              />

              {/* Weather Agent */}
              <AgentResult
                icon="🌤️"
                name="Weather Agent"
                color="blue"
                analysis={result.agents.weather?.analysis}
              />

              {/* Activity Agent */}
              <AgentResult
                icon="🎯"
                name="Activity Agent"
                color="purple"
                analysis={result.agents.activity?.analysis}
              />

              {/* Action Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg transition"
                >
                  Apply Recommendations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ icon, name, desc }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-neutral-200 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="font-semibold text-sm text-neutral-900">{name}</div>
      <div className="text-xs text-neutral-500">{desc}</div>
    </div>
  );
}

function AgentResult({ icon, name, color, analysis, metrics }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200'
  };

  return (
    <div className={`rounded-xl p-6 border ${colorClasses[color] || 'bg-neutral-50 border-neutral-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-bold text-neutral-900">{name}</h3>
      </div>
      
      {metrics && (
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-neutral-600">Budget</div>
            <div className="font-bold text-lg">${metrics.totalBudget?.toLocaleString()}</div>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-neutral-600">Remaining</div>
            <div className="font-bold text-lg">${metrics.remaining?.toLocaleString()}</div>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-neutral-600">Daily Budget</div>
            <div className="font-bold text-lg">${metrics.dailyBudget?.toLocaleString()}</div>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-neutral-600">Status</div>
            <div className={`font-bold text-lg ${metrics.status === 'healthy' ? 'text-green-600' : 'text-orange-600'}`}>
              {metrics.status === 'healthy' ? '✓ Healthy' : '⚠ Warning'}
            </div>
          </div>
        </div>
      )}
      
      <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
        {analysis}
      </div>
    </div>
  );
}
