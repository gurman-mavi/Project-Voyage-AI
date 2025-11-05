// Real-time service for price tracking, weather updates, and dynamic suggestions

class RealtimeService {
  constructor() {
    this.subscribers = new Map();
    this.intervals = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Subscribe to real-time updates
  subscribe(type, callback, options = {}) {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Map());
    }
    
    this.subscribers.get(type).set(id, { callback, options });
    
    // Start the service if not already running
    this.startService(type);
    
    return () => this.unsubscribe(type, id);
  }

  // Unsubscribe from updates
  unsubscribe(type, id) {
    const typeSubscribers = this.subscribers.get(type);
    if (typeSubscribers) {
      typeSubscribers.delete(id);
      
      // Stop service if no more subscribers
      if (typeSubscribers.size === 0) {
        this.stopService(type);
      }
    }
  }

  // Start service for a specific type
  startService(type) {
    if (this.intervals.has(type)) return;
    
    const interval = setInterval(() => {
      this.updateSubscribers(type);
    }, this.getUpdateInterval(type));
    
    this.intervals.set(type, interval);
  }

  // Stop service for a specific type
  stopService(type) {
    const interval = this.intervals.get(type);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(type);
    }
  }

  // Get update interval based on type
  getUpdateInterval(type) {
    const intervals = {
      price: 30000,      // 30 seconds
      weather: 300000,   // 5 minutes
      alerts: 60000,     // 1 minute
      suggestions: 120000 // 2 minutes
    };
    
    return intervals[type] || 60000;
  }

  // Update all subscribers of a type
  async updateSubscribers(type) {
    const typeSubscribers = this.subscribers.get(type);
    if (!typeSubscribers || typeSubscribers.size === 0) return;
    
    try {
      const data = await this.fetchData(type);
      
      typeSubscribers.forEach(({ callback, options }) => {
        try {
          callback(data, options);
        } catch (error) {
          console.error(`Error in ${type} subscriber:`, error);
        }
      });
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
    }
  }

  // Fetch data based on type
  async fetchData(type) {
    switch (type) {
      case 'price':
        return await this.fetchPriceUpdates();
      case 'weather':
        return await this.fetchWeatherUpdates();
      case 'alerts':
        return await this.fetchPriceAlerts();
      case 'suggestions':
        return await this.fetchDynamicSuggestions();
      default:
        throw new Error(`Unknown data type: ${type}`);
    }
  }

  // Fetch price updates
  async fetchPriceUpdates() {
    try {
      const response = await fetch('/api/realtime/prices', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Price API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Price fetch error:', error);
      return { error: error.message, timestamp: Date.now() };
    }
  }

  // Fetch weather updates
  async fetchWeatherUpdates() {
    try {
      const response = await fetch('/api/realtime/weather', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Weather fetch error:', error);
      return { error: error.message, timestamp: Date.now() };
    }
  }

  // Fetch price alerts
  async fetchPriceAlerts() {
    try {
      const response = await fetch('/api/realtime/alerts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Alerts API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Alerts fetch error:', error);
      return { error: error.message, timestamp: Date.now() };
    }
  }

  // Fetch dynamic suggestions
  async fetchDynamicSuggestions() {
    try {
      const response = await fetch('/api/realtime/suggestions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Suggestions API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Suggestions fetch error:', error);
      return { error: error.message, timestamp: Date.now() };
    }
  }

  // Mock data generators for development
  generateMockPriceData() {
    const destinations = ['CDG', 'NRT', 'DPS', 'JFK', 'DXB', 'BCN'];
    const prices = [];
    
    destinations.forEach(dest => {
      const basePrice = Math.floor(Math.random() * 1000) + 300;
      const change = (Math.random() - 0.5) * 100; // -50 to +50
      const newPrice = Math.max(200, basePrice + change);
      
      prices.push({
        destination: dest,
        currentPrice: newPrice,
        previousPrice: basePrice,
        change: change,
        changePercent: ((change / basePrice) * 100).toFixed(1),
        timestamp: Date.now(),
        trend: change > 0 ? 'up' : 'down'
      });
    });
    
    return { prices, timestamp: Date.now() };
  }

  generateMockWeatherData() {
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Clear'];
    const destinations = ['CDG', 'NRT', 'DPS', 'JFK', 'DXB', 'BCN'];
    const weather = [];
    
    destinations.forEach(dest => {
      weather.push({
        destination: dest,
        current: {
          temp: Math.floor(Math.random() * 30) + 10,
          condition: conditions[Math.floor(Math.random() * conditions.length)],
          humidity: Math.floor(Math.random() * 40) + 40,
          windSpeed: Math.floor(Math.random() * 20) + 5
        },
        forecast: Array.from({ length: 5 }, (_, i) => ({
          day: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('en', { weekday: 'short' }),
          high: Math.floor(Math.random() * 15) + 20,
          low: Math.floor(Math.random() * 10) + 10,
          condition: conditions[Math.floor(Math.random() * conditions.length)]
        })),
        timestamp: Date.now()
      });
    });
    
    return { weather, timestamp: Date.now() };
  }

  generateMockAlerts() {
    const alertTypes = ['price_drop', 'price_rise', 'new_deal', 'weather_alert'];
    const destinations = ['CDG', 'NRT', 'DPS', 'JFK', 'DXB', 'BCN'];
    const alerts = [];
    
    // Generate 1-3 random alerts
    const numAlerts = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numAlerts; i++) {
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      
      alerts.push({
        id: Date.now() + i,
        type,
        destination: dest,
        message: this.generateAlertMessage(type, dest),
        severity: Math.random() > 0.7 ? 'high' : 'medium',
        timestamp: Date.now(),
        read: false
      });
    }
    
    return { alerts, timestamp: Date.now() };
  }

  generateAlertMessage(type, destination) {
    const messages = {
      price_drop: `Flight prices to ${destination} have dropped by 15%!`,
      price_rise: `Flight prices to ${destination} have increased by 8%`,
      new_deal: `New hotel deal available in ${destination}`,
      weather_alert: `Weather alert: Rain expected in ${destination}`
    };
    
    return messages[type] || `Update for ${destination}`;
  }

  // Development mode - use mock data
  async fetchMockData(type) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
    switch (type) {
      case 'price':
        return this.generateMockPriceData();
      case 'weather':
        return this.generateMockWeatherData();
      case 'alerts':
        return this.generateMockAlerts();
      case 'suggestions':
        return {
          suggestions: [
            { type: 'destination', title: 'New trending destination', description: 'Santorini is trending this week' },
            { type: 'deal', title: 'Flash sale', description: '50% off flights to Bali' }
          ],
          timestamp: Date.now()
        };
      default:
        return { error: 'Unknown type', timestamp: Date.now() };
    }
  }

  // Override fetchData for development
  async fetchData(type) {
    // In development, use mock data
    if (process.env.NODE_ENV === 'development') {
      return await this.fetchMockData(type);
    }
    
    // In production, use real API calls
    return await this.fetchData(type);
  }

  // Cleanup all services
  destroy() {
    this.intervals.forEach((interval, type) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.subscribers.clear();
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

export default realtimeService;

