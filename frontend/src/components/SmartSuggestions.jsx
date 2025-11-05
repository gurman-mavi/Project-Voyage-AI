// frontend/src/components/SmartSuggestions.jsx
import { useState, useEffect } from 'react';

const POPULAR_DESTINATIONS = [
  {
    name: "Paris, France",
    code: "CDG",
    image: "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=300&fit=crop",
    description: "City of Light - Culture, Food, Romance",
    interests: ["Culture", "Food", "History"],
    bestTime: "Spring/Fall",
    budget: "$$$",
    trending: true,
    priceRange: { min: 800, max: 1500 },
    duration: "5-7 days"
  },
  {
    name: "Tokyo, Japan", 
    code: "NRT",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
    description: "Modern meets Traditional - Technology, Culture",
    interests: ["Culture", "Food", "Technology"],
    bestTime: "Spring/Fall",
    budget: "$$$",
    trending: true,
    priceRange: { min: 1000, max: 2000 },
    duration: "7-10 days"
  },
  {
    name: "Bali, Indonesia",
    code: "DPS", 
    image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&h=300&fit=crop",
    description: "Tropical Paradise - Beaches, Wellness, Nature",
    interests: ["Beach", "Wellness", "Nature"],
    bestTime: "Apr-Oct",
    budget: "$$",
    trending: false,
    priceRange: { min: 400, max: 800 },
    duration: "5-10 days"
  },
  {
    name: "New York, USA",
    code: "JFK",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop", 
    description: "The Big Apple - Culture, Shopping, Nightlife",
    interests: ["Culture", "Shopping", "Nightlife"],
    bestTime: "Spring/Fall",
    budget: "$$$",
    trending: false,
    priceRange: { min: 900, max: 1800 },
    duration: "4-7 days"
  },
  {
    name: "Dubai, UAE",
    code: "DXB",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop",
    description: "Modern Luxury - Shopping, Architecture, Adventure", 
    interests: ["Shopping", "Adventure", "Culture"],
    bestTime: "Nov-Mar",
    budget: "$$$",
    trending: true,
    priceRange: { min: 700, max: 1400 },
    duration: "4-6 days"
  },
  {
    name: "Barcelona, Spain",
    code: "BCN",
    image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop",
    description: "Art & Architecture - Culture, Food, Beach",
    interests: ["Culture", "Food", "Beach"],
    bestTime: "Spring/Fall", 
    budget: "$$",
    trending: false,
    priceRange: { min: 500, max: 1000 },
    duration: "4-6 days"
  },
  {
    name: "Santorini, Greece",
    code: "JTR",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop",
    description: "Stunning Sunsets - Romance, Beaches, History",
    interests: ["Beach", "History", "Photography"],
    bestTime: "May-Oct",
    budget: "$$",
    trending: true,
    priceRange: { min: 600, max: 1200 },
    duration: "3-5 days"
  },
  {
    name: "Reykjavik, Iceland",
    code: "KEF",
    image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?w=400&h=300&fit=crop",
    description: "Land of Fire & Ice - Nature, Adventure, Northern Lights",
    interests: ["Nature", "Adventure", "Photography"],
    bestTime: "Jun-Aug, Dec-Mar",
    budget: "$$$",
    trending: false,
    priceRange: { min: 800, max: 1600 },
    duration: "5-7 days"
  }
];

const QUICK_TRIP_TEMPLATES = [
  {
    title: "Weekend Getaway",
    duration: "2-3 days",
    description: "Perfect for a short break",
    suggestions: ["Paris", "Barcelona", "Dubai"],
    budget: 800,
    interests: ["Culture", "Food"],
    icon: "🏖️"
  },
  {
    title: "Week Long Adventure", 
    duration: "7-10 days",
    description: "Explore a new culture",
    suggestions: ["Tokyo", "Bali", "New York"],
    budget: 1500,
    interests: ["Culture", "Adventure", "Food"],
    icon: "🗺️"
  },
  {
    title: "Extended Vacation",
    duration: "2+ weeks", 
    description: "Deep dive into a destination",
    suggestions: ["Bali", "Barcelona", "Tokyo"],
    budget: 2500,
    interests: ["Culture", "Nature", "Wellness"],
    icon: "🌍"
  },
  {
    title: "Romantic Escape",
    duration: "4-5 days",
    description: "Perfect for couples",
    suggestions: ["Santorini", "Paris", "Bali"],
    budget: 1200,
    interests: ["Beach", "History", "Photography"],
    icon: "💕"
  },
  {
    title: "Adventure Seeker",
    duration: "6-8 days",
    description: "For thrill seekers",
    suggestions: ["Iceland", "Dubai", "New York"],
    budget: 1800,
    interests: ["Adventure", "Nature", "Photography"],
    icon: "🏔️"
  }
];

const INTEREST_CATEGORIES = {
  "Culture": ["Paris", "Tokyo", "Barcelona", "New York"],
  "Food": ["Paris", "Tokyo", "Barcelona", "Bali"],
  "Beach": ["Bali", "Santorini", "Barcelona"],
  "Adventure": ["Iceland", "Dubai", "New York"],
  "Nature": ["Iceland", "Bali"],
  "History": ["Paris", "Barcelona", "Santorini"],
  "Photography": ["Santorini", "Iceland", "Paris"],
  "Wellness": ["Bali", "Santorini"],
  "Shopping": ["Dubai", "New York", "Tokyo"],
  "Nightlife": ["New York", "Barcelona", "Dubai"]
};

export default function SmartSuggestions({ onDestinationSelect, onQuickFill, onAgenticAction, userPreferences = {} }) {
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [filteredDestinations, setFilteredDestinations] = useState(POPULAR_DESTINATIONS);
  const [selectedInterest, setSelectedInterest] = useState('all');

  // Filter destinations based on user preferences and selected interest
  useEffect(() => {
    let filtered = POPULAR_DESTINATIONS;
    
    // Filter by interest
    if (selectedInterest !== 'all') {
      filtered = filtered.filter(dest => 
        dest.interests.includes(selectedInterest)
      );
    }
    
    // Sort by trending first, then by name
    filtered = filtered.sort((a, b) => {
      if (a.trending && !b.trending) return -1;
      if (!a.trending && b.trending) return 1;
      return a.name.localeCompare(b.name);
    });
    
    setFilteredDestinations(filtered);
  }, [selectedInterest, userPreferences]);

  const handleDestinationClick = (destination) => {
    onDestinationSelect(destination.code, destination.name);
    // Trigger agentic AI guidance
    if (onAgenticAction) {
      onAgenticAction('destination_selected', { destination });
    }
  };

  const handleQuickFill = (template) => {
    const destination = POPULAR_DESTINATIONS.find(d => 
      template.suggestions.includes(d.name.split(',')[0])
    );
    if (destination) {
      onQuickFill({
        destination: destination.code,
        destinationName: destination.name,
        interests: template.interests,
        adults: 2,
        budget: template.budget
      });
    }
  };

  const getPersonalizedSuggestions = () => {
    if (!userPreferences.interests || userPreferences.interests.length === 0) {
      return POPULAR_DESTINATIONS.slice(0, 4);
    }
    
    return POPULAR_DESTINATIONS
      .filter(dest => 
        dest.interests.some(interest => userPreferences.interests.includes(interest))
      )
      .sort((a, b) => {
        const aScore = a.interests.filter(i => userPreferences.interests.includes(i)).length;
        const bScore = b.interests.filter(i => userPreferences.interests.includes(i)).length;
        return bScore - aScore;
      })
      .slice(0, 4);
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setSelectedCategory('popular')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            selectedCategory === 'popular'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🌟 Popular
        </button>
        <button
          onClick={() => setSelectedCategory('personalized')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            selectedCategory === 'personalized'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🎯 For You
        </button>
        <button
          onClick={() => setSelectedCategory('templates')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            selectedCategory === 'templates'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚡ Templates
        </button>
      </div>

      {/* Popular Destinations */}
      {selectedCategory === 'popular' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-900">Trending Destinations</h4>
            <select
              value={selectedInterest}
              onChange={(e) => setSelectedInterest(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded-md bg-white"
            >
              <option value="all">All Interests</option>
              {Object.keys(INTEREST_CATEGORIES).map(interest => (
                <option key={interest} value={interest}>{interest}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {filteredDestinations.map((destination, index) => (
              <div
                key={index}
                onClick={() => handleDestinationClick(destination)}
                className="group cursor-pointer bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="flex">
                  <div className="w-20 h-20 flex-shrink-0 relative">
                    <img
                      src={destination.image}
                      alt={destination.name}
                      className="w-full h-full object-cover"
                    />
                    {destination.trending && (
                      <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                        🔥
                      </div>
                    )}
                    {/* Real data indicator */}
                    <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                      ✓
                    </div>
                  </div>
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {destination.name}
                      </h5>
                      <div className="text-right">
                        <span className="text-xs text-slate-500">{destination.duration}</span>
                        <div className="text-xs text-green-600 font-medium mt-1">Real flights & hotels</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {destination.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>Best: {destination.bestTime}</span>
                      <span>•</span>
                      <span>${destination.priceRange.min}-{destination.priceRange.max}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {destination.interests.slice(0, 3).map(interest => (
                        <span key={interest} className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personalized Suggestions */}
      {selectedCategory === 'personalized' && (
        <div className="space-y-4">
          <h4 className="font-medium text-slate-900">Recommended for You</h4>
          {userPreferences.interests && userPreferences.interests.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {getPersonalizedSuggestions().map((destination, index) => (
                <div
                  key={index}
                  onClick={() => handleDestinationClick(destination)}
                  className="group cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="flex">
                    <div className="w-20 h-20 flex-shrink-0 relative">
                      <img
                        src={destination.image}
                        alt={destination.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                        🎯
                      </div>
                    </div>
                    <div className="flex-1 p-3">
                      <h5 className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {destination.name}
                      </h5>
                      <p className="text-sm text-slate-600 mt-1">
                        {destination.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>Perfect for your interests</span>
                        <span>•</span>
                        <span>${destination.priceRange.min}-{destination.priceRange.max}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">No preferences set yet</p>
              <p className="text-xs text-gray-500">Select your interests in the form to get personalized recommendations</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Templates */}
      {selectedCategory === 'templates' && (
        <div className="space-y-4">
          <h4 className="font-medium text-slate-900">Quick Trip Templates</h4>
          <div className="space-y-3">
            {QUICK_TRIP_TEMPLATES.map((template, index) => (
              <div
                key={index}
                onClick={() => handleQuickFill(template)}
                className="cursor-pointer bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{template.icon}</span>
                      <h5 className="font-medium text-slate-900">{template.title}</h5>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded">
                        {template.duration}
                      </span>
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                        ${template.budget}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {template.interests.map(interest => (
                        <span key={interest} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Suggested: {template.suggestions.join(', ')}
                    </p>
                  </div>
                  <div className="text-indigo-600 ml-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 <strong>Pro Tip:</strong> Click any destination to auto-fill the form, or use quick templates for instant trip planning! 
          <br />
          <span className="text-xs text-blue-600 mt-1 block">
            All destinations show real flight and hotel data when you plan your trip
          </span>
        </p>
      </div>
    </div>
  );
}



