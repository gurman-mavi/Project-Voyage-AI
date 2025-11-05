// Enhanced storage utilities for user preferences and trip data

const STORAGE_KEYS = {
  TRIP_FORM: 'voyage_trip_form',
  USER_PREFERENCES: 'voyage_user_preferences',
  RECENT_DESTINATIONS: 'voyage_recent_destinations',
  SAVED_TRIPS: 'voyage_saved_trips',
  AI_INSIGHTS: 'voyage_ai_insights',
  PRICE_ALERTS: 'voyage_price_alerts'
};

class StorageManager {
  constructor() {
    this.isAvailable = typeof Storage !== 'undefined';
  }

  // Generic storage methods
  set(key, value, expiration = null) {
    if (!this.isAvailable) return false;
    
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expiration: expiration ? Date.now() + expiration : null
      };
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  get(key, defaultValue = null) {
    if (!this.isAvailable) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      
      const data = JSON.parse(item);
      
      // Check expiration
      if (data.expiration && Date.now() > data.expiration) {
        this.remove(key);
        return defaultValue;
      }
      
      return data.value;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  remove(key) {
    if (!this.isAvailable) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  // Trip form specific methods
  saveTripForm(formData) {
    return this.set(STORAGE_KEYS.TRIP_FORM, formData);
  }

  getTripForm() {
    return this.get(STORAGE_KEYS.TRIP_FORM, {
      origin: "DEL",
      destination: "IST",
      start: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      end: new Date(Date.now() + 19 * 86400000).toISOString().slice(0, 10),
      budget: 1200,
      adults: 1,
      interests: ["Culture", "Food"]
    });
  }

  // User preferences
  saveUserPreferences(preferences) {
    return this.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  getUserPreferences() {
    return this.get(STORAGE_KEYS.USER_PREFERENCES, {
      interests: [],
      budgetRange: { min: 500, max: 3000 },
      preferredDestinations: [],
      travelStyle: 'balanced',
      notifications: {
        priceAlerts: true,
        weatherUpdates: true,
        deals: true
      }
    });
  }

  // Recent destinations
  addRecentDestination(destination) {
    const recent = this.getRecentDestinations();
    const updated = [destination, ...recent.filter(d => d.code !== destination.code)].slice(0, 10);
    return this.set(STORAGE_KEYS.RECENT_DESTINATIONS, updated);
  }

  getRecentDestinations() {
    return this.get(STORAGE_KEYS.RECENT_DESTINATIONS, []);
  }

  // Saved trips
  saveTrip(tripData) {
    const saved = this.getSavedTrips();
    const trip = {
      id: Date.now(),
      ...tripData,
      savedAt: new Date().toISOString()
    };
    saved.unshift(trip);
    return this.set(STORAGE_KEYS.SAVED_TRIPS, saved.slice(0, 20)); // Keep last 20 trips
  }

  getSavedTrips() {
    return this.get(STORAGE_KEYS.SAVED_TRIPS, []);
  }

  removeSavedTrip(tripId) {
    const saved = this.getSavedTrips();
    const updated = saved.filter(trip => trip.id !== tripId);
    return this.set(STORAGE_KEYS.SAVED_TRIPS, updated);
  }

  // AI insights cache
  saveAIInsights(destination, insights) {
    const cached = this.getAIInsights();
    cached[destination] = {
      insights,
      timestamp: Date.now()
    };
    return this.set(STORAGE_KEYS.AI_INSIGHTS, cached, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  getAIInsights() {
    return this.get(STORAGE_KEYS.AI_INSIGHTS, {});
  }

  getCachedAIInsights(destination) {
    const cached = this.getAIInsights();
    const data = cached[destination];
    
    if (data && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
      return data.insights;
    }
    
    return null;
  }

  // Price alerts
  savePriceAlerts(alerts) {
    return this.set(STORAGE_KEYS.PRICE_ALERTS, alerts);
  }

  getPriceAlerts() {
    return this.get(STORAGE_KEYS.PRICE_ALERTS, []);
  }

  addPriceAlert(alert) {
    const alerts = this.getPriceAlerts();
    alerts.push({
      id: Date.now(),
      ...alert,
      createdAt: new Date().toISOString()
    });
    return this.savePriceAlerts(alerts);
  }

  // Analytics and usage tracking
  trackUsage(action, data = {}) {
    const usage = this.get('voyage_usage_stats', {});
    const today = new Date().toISOString().split('T')[0];
    
    if (!usage[today]) {
      usage[today] = {};
    }
    
    if (!usage[today][action]) {
      usage[today][action] = 0;
    }
    
    usage[today][action]++;
    this.set('voyage_usage_stats', usage, 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  // Export/Import functionality
  exportData() {
    const data = {
      tripForm: this.getTripForm(),
      userPreferences: this.getUserPreferences(),
      recentDestinations: this.getRecentDestinations(),
      savedTrips: this.getSavedTrips(),
      priceAlerts: this.getPriceAlerts(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(data, null, 2);
  }

  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.version !== '1.0') {
        throw new Error('Unsupported data version');
      }
      
      if (data.tripForm) this.saveTripForm(data.tripForm);
      if (data.userPreferences) this.saveUserPreferences(data.userPreferences);
      if (data.recentDestinations) this.set(STORAGE_KEYS.RECENT_DESTINATIONS, data.recentDestinations);
      if (data.savedTrips) this.set(STORAGE_KEYS.SAVED_TRIPS, data.savedTrips);
      if (data.priceAlerts) this.savePriceAlerts(data.priceAlerts);
      
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  // Clear all data
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.remove(key);
    });
    this.remove('voyage_usage_stats');
  }
}

// Create singleton instance
const storage = new StorageManager();

export default storage;
export { STORAGE_KEYS };

