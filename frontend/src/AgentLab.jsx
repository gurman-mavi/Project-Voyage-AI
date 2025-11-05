// Agent Lab - Experimental AI Agents Playground
import { useState } from 'react';
import MultiAgentAnalysis from './components/MultiAgentAnalysis';

export default function AgentLab() {
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [showMultiAgent, setShowMultiAgent] = useState(false);

  const demoTrips = [
    {
      id: 'paris',
      name: 'Paris Weekend',
      destination: 'Paris',
      budget: 150000,
      duration: 3,
      dates: { start: '2025-12-15', end: '2025-12-18' },
      interests: ['Culture', 'Food', 'History'],
      flightPrice: 45000,
      hotelPrice: 35000,
      icon: '🗼',
      description: 'Romantic getaway to the City of Light'
    },
    {
      id: 'tokyo',
      name: 'Tokyo Adventure',
      destination: 'Tokyo',
      budget: 200000,
      duration: 7,
      dates: { start: '2025-11-20', end: '2025-11-27' },
      interests: ['Culture', 'Food', 'Shopping', 'Technology'],
      flightPrice: 65000,
      hotelPrice: 70000,
      icon: '🗾',
      description: 'Explore modern Japan and ancient traditions'
    },
    {
      id: 'bali',
      name: 'Bali Retreat',
      destination: 'Bali',
      budget: 80000,
      duration: 5,
      dates: { start: '2025-12-01', end: '2025-12-06' },
      interests: ['Beach', 'Wellness', 'Nature'],
      flightPrice: 25000,
      hotelPrice: 20000,
      icon: '🏝️',
      description: 'Tropical paradise and wellness retreat'
    },
    {
      id: 'dubai',
      name: 'Dubai Luxury',
      destination: 'Dubai',
      budget: 250000,
      duration: 4,
      dates: { start: '2025-11-10', end: '2025-11-14' },
      interests: ['Shopping', 'Luxury', 'Adventure'],
      flightPrice: 40000,
      hotelPrice: 80000,
      icon: '🏙️',
      description: 'Luxury and adventure in the desert city'
    }
  ];

  const agents = [
    {
      id: 'budget',
      name: 'Budget Agent',
      icon: '💰',
      description: 'Analyzes costs and optimizes spending',
      color: 'from-green-400 to-emerald-600'
    },
    {
      id: 'weather',
      name: 'Weather Agent',
      icon: '🌤️',
      description: 'Forecasts and suggests best travel days',
      color: 'from-blue-400 to-cyan-600'
    },
    {
      id: 'activity',
      name: 'Activity Agent',
      icon: '🎯',
      description: 'Curates experiences based on interests',
      color: 'from-purple-400 to-pink-600'
    },
    {
      id: 'coordinator',
      name: 'Coordinator Agent',
      icon: '🎭',
      description: 'Synthesizes insights into unified plan',
      color: 'from-indigo-400 to-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg">
            <span className="text-4xl">🤖</span>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">
            Agent Lab
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Experiment with our AI agents. See how multiple specialized agents collaborate to analyze trips and provide intelligent recommendations.
          </p>
        </div>

        {/* AI Agents Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Our AI Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="bg-white rounded-xl p-6 border-2 border-neutral-200 hover:border-indigo-300 hover:shadow-lg transition-all"
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center text-3xl mb-4 shadow-md`}>
                  {agent.icon}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{agent.name}</h3>
                <p className="text-sm text-neutral-600">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Trips */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Try Demo Trips</h2>
          <p className="text-neutral-600 mb-6">
            Select a demo trip to see how our multi-agent system analyzes it and provides recommendations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {demoTrips.map(trip => (
              <div
                key={trip.id}
                onClick={() => setSelectedDemo(trip)}
                className={`bg-white rounded-xl p-6 border-2 cursor-pointer transition-all hover:shadow-xl ${
                  selectedDemo?.id === trip.id
                    ? 'border-indigo-500 shadow-lg'
                    : 'border-neutral-200 hover:border-indigo-300'
                }`}
              >
                <div className="text-5xl mb-3">{trip.icon}</div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{trip.name}</h3>
                <p className="text-sm text-neutral-600 mb-3">{trip.description}</p>
                <div className="space-y-1 text-xs text-neutral-500">
                  <div>📅 {trip.duration} days</div>
                  <div>💰 ₹{trip.budget.toLocaleString()}</div>
                  <div>🎯 {trip.interests.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        {selectedDemo && (
          <div className="text-center mb-12">
            <button
              onClick={() => setShowMultiAgent(true)}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold rounded-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              🤖 Analyze {selectedDemo.name} with AI Agents
            </button>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white rounded-2xl p-8 border-2 border-neutral-200 shadow-lg">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">How Multi-Agent System Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-3">🔄 Parallel Processing</h3>
              <p className="text-neutral-600 text-sm">
                All agents work simultaneously, analyzing different aspects of your trip in parallel for faster results.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-3">🎯 Specialization</h3>
              <p className="text-neutral-600 text-sm">
                Each agent is an expert in its domain - budget, weather, activities, or coordination.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-3">🤝 Collaboration</h3>
              <p className="text-neutral-600 text-sm">
                The Coordinator Agent synthesizes insights from all agents into one coherent plan.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-3">💡 Intelligence</h3>
              <p className="text-neutral-600 text-sm">
                Powered by Groq's Llama 3.3 70B model for fast, intelligent reasoning and recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Lightning Fast</h3>
            <p className="text-sm text-neutral-600">
              Groq's infrastructure provides near-instant AI responses
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Highly Accurate</h3>
            <p className="text-sm text-neutral-600">
              Specialized agents provide domain-specific expertise
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
            <div className="text-3xl mb-3">🔮</div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Predictive</h3>
            <p className="text-sm text-neutral-600">
              Anticipates needs and suggests optimizations proactively
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Agent Modal */}
      {showMultiAgent && selectedDemo && (
        <MultiAgentAnalysis
          tripData={selectedDemo}
          onClose={() => setShowMultiAgent(false)}
        />
      )}
    </div>
  );
}
