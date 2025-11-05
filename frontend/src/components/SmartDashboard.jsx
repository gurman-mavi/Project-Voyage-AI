// frontend/src/components/SmartDashboard.jsx
import { useState, useEffect } from 'react';
import { useWeatherUpdates, usePriceAlerts } from '../hooks/useRealtime.js';

export default function SmartDashboard({ tripData, insights, className = "" }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Use real-time data
  const { data: weatherData, loading: weatherLoading, error: weatherError, lastUpdate } = useWeatherUpdates(tripData?.destination);
  const { data: alertsData, loading: alertsLoading, error: alertsError } = usePriceAlerts();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'weather', label: 'Weather', icon: '🌤️' },
    { id: 'insights', label: 'AI Insights', icon: '🤖' },
    { id: 'alerts', label: 'Price Alerts', icon: '🔔' }
  ];

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Smart Dashboard</h2>
        <p className="text-slate-600">AI-powered insights for your trip</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Budget</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {tripData?.budget ? `$${Number(tripData.budget).toLocaleString()}` : 'Not set'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">💰</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Trip Duration</p>
                    <p className="text-2xl font-bold text-green-900">
                      {tripData?.start && tripData?.end ? 
                        `${Math.max(1, Math.ceil((new Date(tripData.end) - new Date(tripData.start)) / (1000 * 60 * 60 * 24)))} days` 
                        : 'Not set'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">📅</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Travelers</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {tripData?.adults || 'Not set'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">👥</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-3">Trip Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Destination:</span>
                  <span className="ml-2 font-medium">{tripData?.destination || 'Not selected'}</span>
                </div>
                <div>
                  <span className="text-slate-600">Origin:</span>
                  <span className="ml-2 font-medium">{tripData?.origin || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-slate-600">Dates:</span>
                  <span className="ml-2 font-medium">
                    {tripData?.start && tripData?.end 
                      ? `${tripData.start} to ${tripData.end}` 
                      : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Interests:</span>
                  <span className="ml-2 font-medium">
                    {tripData?.interests && tripData.interests.length > 0 
                      ? tripData.interests.join(', ') 
                      : 'Not specified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="space-y-6">
            {weatherLoading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                <p className="text-slate-600">Loading weather data...</p>
              </div>
            ) : weatherError ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-red-500 text-xl">⚠️</span>
                </div>
                <p className="text-red-600">Failed to load weather data</p>
                <p className="text-sm text-slate-500 mt-1">{weatherError}</p>
              </div>
            ) : weatherData?.weather ? (
              <>
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Current Weather</h3>
                      <p className="text-3xl font-bold">{weatherData.weather[0]?.current?.temp || 'N/A'}°C</p>
                      <p className="text-blue-100">{weatherData.weather[0]?.current?.condition || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-100">Humidity</p>
                      <p className="text-xl font-semibold">{weatherData.weather[0]?.current?.humidity || 'N/A'}%</p>
                    </div>
                  </div>
                  {lastUpdate && (
                    <p className="text-xs text-blue-200 mt-2">
                      Last updated: {lastUpdate.toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">5-Day Forecast</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {weatherData.weather[0]?.forecast?.map((day, index) => (
                      <div key={index} className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm font-medium text-slate-900">{day.day}</p>
                        <p className="text-xs text-slate-600 mt-1">{day.condition}</p>
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-slate-900">{day.high}°</p>
                          <p className="text-xs text-slate-500">{day.low}°</p>
                        </div>
                      </div>
                    )) || Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="h-4 bg-slate-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600">No weather data available</p>
                <p className="text-sm text-slate-500 mt-1">Select a destination to see weather information</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            {insights ? (
              <>
                {insights.insights && insights.insights.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                      <span className="mr-2">💡</span>
                      AI Insights
                    </h3>
                    <ul className="space-y-2">
                      {insights.insights.map((insight, index) => (
                        <li key={index} className="text-sm text-purple-800 flex items-start">
                          <span className="mr-2">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.localTips && insights.localTips.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                      <span className="mr-2">🏛️</span>
                      Local Tips
                    </h3>
                    <ul className="space-y-2">
                      {insights.localTips.map((tip, index) => (
                        <li key={index} className="text-sm text-green-800 flex items-start">
                          <span className="mr-2">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.optimizations && insights.optimizations.length > 0 && (
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-3 flex items-center">
                      <span className="mr-2">⚡</span>
                      Optimizations
                    </h3>
                    <ul className="space-y-2">
                      {insights.optimizations.map((opt, index) => (
                        <li key={index} className="text-sm text-orange-800">
                          <span className="font-medium">{opt.area}:</span> {opt.suggestion}
                          {opt.savings && <span className="text-orange-600 ml-1">({opt.savings})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Enhanced AI Recommendations */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <span className="mr-2">🎯</span>
                    Smart Recommendations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Best Time to Visit</h4>
                      <p className="text-sm text-blue-800">
                        {tripData?.destination === 'CDG' ? 'Spring (April-June) or Fall (September-November) for mild weather and fewer crowds.' :
                         tripData?.destination === 'NRT' ? 'Spring (March-May) for cherry blossoms or Fall (September-November) for pleasant weather.' :
                         tripData?.destination === 'DPS' ? 'April-October for dry season with less humidity.' :
                         'Check local weather patterns for optimal travel timing.'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Budget Optimization</h4>
                      <p className="text-sm text-blue-800">
                        {tripData?.budget > 2000 ? 'Consider luxury experiences and premium accommodations.' :
                         tripData?.budget > 1000 ? 'Mix of mid-range hotels and local experiences recommended.' :
                         'Focus on budget accommodations and free/low-cost activities.'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Cultural Highlights</h4>
                      <p className="text-sm text-blue-800">
                        {tripData?.interests?.includes('Culture') ? 'Prioritize museums, historical sites, and local cultural events.' :
                         tripData?.interests?.includes('Food') ? 'Focus on local cuisine experiences and food tours.' :
                         'Explore a mix of popular attractions and hidden gems.'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Travel Tips</h4>
                      <p className="text-sm text-blue-800">
                        {tripData?.adults > 2 ? 'Group discounts may be available for activities and dining.' :
                         'Perfect for intimate experiences and flexible scheduling.'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-xl">🤖</span>
                </div>
                <p className="text-slate-600 mb-2">Generate a trip plan to see AI insights</p>
                <p className="text-xs text-slate-500">Our AI will analyze your preferences and provide personalized recommendations</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Price Alerts & Deals</h3>
              <button className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors">
                + Add Alert
              </button>
            </div>
            
            {alertsLoading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                <p className="text-slate-600">Loading alerts...</p>
              </div>
            ) : alertsError ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-red-500 text-xl">⚠️</span>
                </div>
                <p className="text-red-600">Failed to load alerts</p>
                <p className="text-sm text-slate-500 mt-1">{alertsError}</p>
              </div>
            ) : alertsData?.alerts && alertsData.alerts.length > 0 ? (
              <div className="space-y-3">
                {alertsData.alerts.map((alert, index) => (
                  <div key={alert.id || index} className={`p-4 rounded-xl border ${
                    alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                    alert.type === 'price_drop' ? 'bg-green-50 border-green-200' :
                    alert.type === 'new_deal' ? 'bg-blue-50 border-blue-200' :
                    'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${
                          alert.severity === 'high' ? 'text-red-900' :
                          alert.type === 'price_drop' ? 'text-green-900' :
                          alert.type === 'new_deal' ? 'text-blue-900' :
                          'text-orange-900'
                        }`}>
                          {alert.type === 'price_drop' ? '🔥' : 
                           alert.type === 'new_deal' ? '🏨' : 
                           alert.type === 'weather_alert' ? '🌤️' : '🎯'} {alert.message}
                        </p>
                        <p className={`text-sm mt-1 ${
                          alert.severity === 'high' ? 'text-red-700' :
                          alert.type === 'price_drop' ? 'text-green-700' :
                          alert.type === 'new_deal' ? 'text-blue-700' :
                          'text-orange-700'
                        }`}>
                          {alert.destination} • {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {alert.severity === 'high' && (
                          <span className="text-red-600 font-semibold text-lg">!</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600">No alerts available</p>
                <p className="text-sm text-slate-500 mt-1">Set up price alerts to get notified of deals</p>
              </div>
            )}

            {/* Alert Settings */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">Alert Preferences</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Flight price drops</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Hotel deals</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Activity discounts</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Restaurant offers</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
