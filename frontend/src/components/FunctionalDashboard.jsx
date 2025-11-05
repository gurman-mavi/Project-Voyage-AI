// Functional Dashboard - Shows real trip statistics and insights
import { useState, useEffect } from 'react';

export default function FunctionalDashboard({ formData = {}, className = "" }) {
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    totalSpent: 0,
    savedDestinations: 0
  });

  useEffect(() => {
    // Load real statistics from localStorage
    const savedTrips = JSON.parse(localStorage.getItem('voyage_saved_trips') || '[]');
    const priceAlerts = JSON.parse(localStorage.getItem('voyage_price_alerts') || '[]');
    
    const now = new Date();
    const upcoming = savedTrips.filter(trip => {
      if (!trip.dates?.start) return false;
      return new Date(trip.dates.start) > now;
    });

    const totalSpent = savedTrips.reduce((sum, trip) => {
      const flightCost = trip.plan?.options?.[0]?.flight?.price || 0;
      const hotelCost = trip.plan?.options?.[0]?.hotel?.price || 0;
      return sum + flightCost + hotelCost;
    }, 0);

    setStats({
      totalTrips: savedTrips.length,
      upcomingTrips: upcoming.length,
      totalSpent: Math.round(totalSpent),
      savedDestinations: priceAlerts.length
    });
  }, []);

  const getCompletionPercentage = () => {
    let completed = 0;
    let total = 5;

    if (formData.destination) completed++;
    if (formData.start && formData.end) completed++;
    if (formData.adults > 0) completed++;
    if (formData.budget > 0) completed++;
    if (formData.interests && formData.interests.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const getDaysUntilTrip = () => {
    if (!formData.start) return null;
    const start = new Date(formData.start);
    const now = new Date();
    const days = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  };

  const getTripDuration = () => {
    if (!formData.start || !formData.end) return null;
    const start = new Date(formData.start);
    const end = new Date(formData.end);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={`bg-white rounded-2xl border border-neutral-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          📊 Dashboard
        </h3>
      </div>

      {/* Current Trip Info */}
      {formData.destination && (
        <div className="p-4 border-b border-neutral-200 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-neutral-900">Current Trip</h4>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
              {getCompletionPercentage()}% Complete
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-600 mb-1">
            {formData.destination}
          </div>
          <div className="flex gap-4 text-sm text-neutral-600">
            {getDaysUntilTrip() && (
              <div className="flex items-center gap-1">
                <span>⏰</span>
                <span>{getDaysUntilTrip()} days away</span>
              </div>
            )}
            {getTripDuration() && (
              <div className="flex items-center gap-1">
                <span>📅</span>
                <span>{getTripDuration()} days</span>
              </div>
            )}
            {formData.budget > 0 && (
              <div className="flex items-center gap-1">
                <span>💰</span>
                <span>₹{formData.budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <StatCard
          icon="✈️"
          label="Total Trips"
          value={stats.totalTrips}
          color="blue"
        />
        <StatCard
          icon="📅"
          label="Upcoming"
          value={stats.upcomingTrips}
          color="green"
        />
        <StatCard
          icon="💳"
          label="Total Spent"
          value={`₹${(stats.totalSpent / 1000).toFixed(0)}K`}
          color="purple"
        />
        <StatCard
          icon="🔔"
          label="Price Alerts"
          value={stats.savedDestinations}
          color="orange"
        />
      </div>

      {/* Quick Insights */}
      <div className="p-4 border-t border-neutral-200 bg-neutral-50">
        <h4 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-1">
          <span>💡</span>
          <span>Quick Insights</span>
        </h4>
        <div className="space-y-2 text-xs text-neutral-600">
          {formData.destination ? (
            <>
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Destination selected: {formData.destination}</span>
              </div>
              {!formData.start && (
                <div className="flex items-start gap-2">
                  <span className="text-orange-500">⚠</span>
                  <span>Set your travel dates to see flight prices</span>
                </div>
              )}
              {!formData.budget && (
                <div className="flex items-start gap-2">
                  <span className="text-orange-500">⚠</span>
                  <span>Define a budget to get personalized recommendations</span>
                </div>
              )}
              {formData.start && formData.end && formData.budget && (
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Ready to generate your AI trip plan!</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2">
              <span className="text-blue-500">ℹ</span>
              <span>Select a destination to start planning your trip</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "blue" }) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-700",
    green: "from-green-50 to-green-100 border-green-200 text-green-700",
    purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-700",
    orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-700"
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-3`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-neutral-600 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
