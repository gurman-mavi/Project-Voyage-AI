// backend/src/ai/aiService.js
import axios from 'axios';
import { normalizeCatalog, CATALOG } from "../routes/destinations.js";

// Free AI alternatives - using Hugging Face Inference API (free tier)
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HUGGINGFACE_BASE_URL = 'https://api-inference.huggingface.co/models';

// Alternative: Use Groq (free tier with 14,400 requests/day)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Advanced AI Service for Voyage AI
 * Provides conversational AI, natural language processing, and intelligent recommendations
 */

// Conversation memory storage (in production, use Redis or database)
const conversationMemory = new Map();

/**
 * Extract travel intent from natural language using free AI
 */
export async function extractTravelIntent(userMessage, conversationId = 'default') {
  try {
    console.log('Extracting travel intent from:', userMessage);
    
    // Always use pattern matching for now (more reliable)
    const intent = await extractWithPatternMatching(userMessage);
    console.log('Extracted intent:', intent);
    return intent;
  } catch (error) {
    console.error('Error extracting travel intent:', error);
    return {
      origin: null,
      destination: null,
      dates: { start: null, end: null },
      budget: null,
      interests: ['Culture', 'Food'],
      adults: 1,
      children: 0,
      cabin: 'ECONOMY',
      travelStyle: 'mid-range'
    };
  }
}

/**
 * Extract travel intent using Groq (free tier)
 */
async function extractWithGroq(userMessage) {
  try {
    const systemPrompt = `Extract travel information from user messages. Return ONLY JSON:
{
  "origin": "IATA code or city name",
  "destination": "IATA code or city name", 
  "dates": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
  "budget": number,
  "interests": ["Culture", "Food", "Shopping", "Nightlife", "Beach"],
  "adults": number,
  "children": number,
  "cabin": "ECONOMY|PREMIUM_ECONOMY|BUSINESS|FIRST",
  "travelStyle": "budget|mid-range|luxury|adventure|relaxation|business"
}`;

    const response = await axios.post(`${GROQ_BASE_URL}/chat/completions`, {
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0]?.message?.content;
    if (!content) throw new Error('No response from Groq');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Groq extraction failed:', error);
    throw error;
  }
}

/**
 * Extract travel intent using pattern matching (free fallback)
 */
async function extractWithPatternMatching(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Extract origin and destination with better patterns
  const originMatch = message.match(/(?:from|departing from|leaving from|fly from)\s+([a-zA-Z\s]+?)(?:\s|$|,|\.)/);
  
  // Simple word-based destination extraction
  let destination = null;

  // Destination extraction patterns
  const destPatterns = [
    /\btrip to\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
    /\bvisit\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
    /\bgo to\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
    /\btravel to\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
    /\bcity to\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
    /\bto\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/
  ];
  let destRaw = null;
  for (const re of destPatterns) {
    const m = message.match(re);
    if (m && m[1]) { destRaw = m[1].trim().toLowerCase(); break; }
  }

  // Helper: resolve a free-text city to catalog IATA
  function resolveCityToIata(cityLike) {
    if (!cityLike) return null;
    const list = normalizeCatalog(CATALOG);
    const target = cityLike.toLowerCase();
    // exact city match first
    let hit = list.find(d => d.cityName.toLowerCase() === target);
    if (hit) return hit.destinationIata;
    // contains match
    hit = list.find(d => d.cityName.toLowerCase().includes(target));
    if (hit) return hit.destinationIata;
    // startsWith match
    hit = list.find(d => d.cityName.toLowerCase().startsWith(target));
    if (hit) return hit.destinationIata;
    // try code match if user typed an IATA
    hit = list.find(d => d.destinationIata.toLowerCase() === target);
    if (hit) return hit.destinationIata;
    return null;
  }

  // HTTP fallback using our own suggest endpoint
  async function resolveCityViaSuggest(cityLike) {
    try {
      if (!cityLike) return null;
      const base = process.env.PUBLIC_BASE || 'http://localhost:5050';
      const { data } = await axios.get(`${base}/api/destinations/suggest`, {
        params: { q: cityLike, limit: 1 },
        timeout: 6000,
        validateStatus: () => true
      });
      const hit = Array.isArray(data?.data) ? data.data[0] : null;
      return hit?.code || null;
    } catch {
      return null;
    }
  }

  if (!destination) {
    // Try resolving from catalog (e.g., "munich" -> MUC)
    destination = resolveCityToIata(destination);
  }
  if (!destination) {
    // Final fallback via HTTP suggest
    destination = await resolveCityViaSuggest(destination);
  }
  
  // Extract dates
  const dateMatch = message.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/gi);
  
  // Extract budget
  const budgetMatch = message.match(/\$(\d+)|(\d+)\s*dollars?|budget\s*of\s*(\d+)/i);
  
  // Extract interests
  const interests = [];
  if (message.includes('culture') || message.includes('museum') || message.includes('history')) interests.push('Culture');
  if (message.includes('food') || message.includes('restaurant') || message.includes('cuisine')) interests.push('Food');
  if (message.includes('shopping') || message.includes('market') || message.includes('mall')) interests.push('Shopping');
  if (message.includes('nightlife') || message.includes('bar') || message.includes('club')) interests.push('Nightlife');
  if (message.includes('beach') || message.includes('ocean') || message.includes('sea')) interests.push('Beach');
  
  // Extract number of people
  const adultsMatch = message.match(/(\d+)\s*(?:adults?|people|travelers?)/i);
  const adults = adultsMatch ? parseInt(adultsMatch[1]) : 1;
  
  // Common destination mapping
  const destinationMap = {
    'paris': 'CDG',
    'tokyo': 'NRT', 
    'london': 'LHR',
    'new york': 'JFK',
    'dubai': 'DXB',
    'singapore': 'SIN',
    'bangkok': 'BKK',
    'istanbul': 'IST',
    'rome': 'FCO',
    'madrid': 'MAD',
    'amsterdam': 'AMS',
    'zurich': 'ZRH',
    'mumbai': 'BOM',
    'delhi': 'DEL',
    'goa': 'GOI',
    'sydney': 'SYD',
    'melbourne': 'MEL',
    'toronto': 'YYZ',
    'vancouver': 'YVR'
  };
  
  let mappedDestination = destinationMap[destination] || destination?.toUpperCase();
  if (!mappedDestination) {
    // Try resolving from catalog (e.g., "munich" -> MUC)
    mappedDestination = resolveCityToIata(destination);
  }
  if (!mappedDestination) {
    // Final fallback via HTTP suggest
    mappedDestination = await resolveCityViaSuggest(destination);
  }
  
  return {
    origin: originMatch ? (resolveCityToIata(originMatch[1].trim()) || originMatch[1].trim().toUpperCase()) : null,
    destination: mappedDestination,
    dates: {
      start: null, // Would need more sophisticated date parsing
      end: null
    },
    budget: budgetMatch ? parseInt(budgetMatch[1] || budgetMatch[2] || budgetMatch[3]) : null,
    interests: interests.length > 0 ? interests : ['Culture', 'Food'],
    adults: adults,
    children: 0,
    cabin: 'ECONOMY',
    travelStyle: message.includes('luxury') ? 'luxury' : 
                 message.includes('budget') ? 'budget' : 
                 message.includes('adventure') ? 'adventure' : 'mid-range'
  };
}

/**
 * Generate conversational response for travel planning using free AI
 */
export async function generateTravelResponse(userMessage, conversationId = 'default', context = {}) {
  try {
    console.log('Generating travel response for:', userMessage);
    
    // Get conversation history
    const history = conversationMemory.get(conversationId) || [];
    
    // Always use rule-based for now (more reliable)
    const response = await generateWithRuleBased(userMessage, history, context, conversationId);
    console.log('Generated response:', response);
    return response;
  } catch (error) {
    console.error('Error generating travel response:', error);
    return "I'm here to help you plan your trip! Could you tell me where you'd like to go and when?";
  }
}

/**
 * Generate response using Groq (free tier)
 */
async function generateWithGroq(userMessage, history, context) {
  try {
    const systemPrompt = `You are Voyage AI, a helpful travel planning assistant. Be conversational, friendly, and informative.

Your capabilities:
- Plan complete trips with flights, hotels, and daily itineraries
- Provide personalized recommendations based on interests and budget
- Suggest activities, restaurants, and attractions
- Help with travel logistics and tips

Current context: ${JSON.stringify(context)}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6), // Keep last 6 messages for context
      { role: "user", content: userMessage }
    ];

    const response = await axios.post(`${GROQ_BASE_URL}/chat/completions`, {
      model: "llama3-8b-8192",
      messages,
      temperature: 0.7,
      max_tokens: 600
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0]?.message?.content;
    
    // Update conversation memory
    history.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: aiResponse }
    );
    conversationMemory.set('default', history);

    return aiResponse;
  } catch (error) {
    console.error('Groq response generation failed:', error);
    throw error;
  }
}

/**
 * Generate response using rule-based system (free fallback)
 */
async function generateWithRuleBased(userMessage, history, context, conversationId = 'default') {
  const raw = String(userMessage || "");
  const hiddenTopic = raw.match(/\[\[topic:([a-z_]+)\]\]/i)?.[1]?.toLowerCase() || "";
  const cleaned = raw.replace(/\[\[topic:[^\]]+\]\]\n?/i, "").trim();
  const message = cleaned.toLowerCase();
  // Extract simple place like: "For Agartala, IN ..." or "about Tokyo" or "in Paris"
  function parsePlace(src) {
    const m1 = src.match(/for\s+([a-zA-Z\s]+?)(?:,\s*([A-Z]{2}))?(?=[\)\.]|\?|$)/i);
    const m2 = src.match(/about\s+([a-zA-Z\s]+?)(?=[\,\)\.]|\?|$)/i);
    const m3 = src.match(/in\s+([a-zA-Z\s]+?)(?=[\,\)\.]|\?|$)/i);
    let city = (m1?.[1] || m2?.[1] || m3?.[1] || "").trim();
    city = city.replace(/\s+/g, ' ').trim();
    const cc = (m1?.[2] || '').trim().toUpperCase();
    return { city, cc };
  }
  const place = parsePlace(cleaned);

  // Update conversation memory
  const currentHistory = conversationMemory.get(conversationId) || [];
  currentHistory.push({ role: "user", content: userMessage });
  
  let response = "";
  
  // 1) If frontend sent an explicit topic, respect it regardless of message wording
  const topic = String(context?.topic || hiddenTopic || "").toLowerCase();
  if (topic) {
    if (topic === 'best_time') {
      const name = place.city || context?.city || 'this destination';
      const best = 'Nov–Feb (cooler, drier, pleasant)';
      const avoid = 'Jun–Sep (monsoon; heavy rain and humidity)';
      const notes = 'Mar–Apr can be warm; book early for peak season.';
      response = `• Best months: ${best} for ${name}\n• Avoid: ${avoid}\n• Notes: ${notes}`;
    } else if (topic === 'visa') {
      const name = place.city || context?.city || 'destination';
      const cc = (place.cc || context?.country || '').toString().toUpperCase();
      if (cc === 'IN') {
        response = `• Visa: Not required for Indian citizens traveling domestically\n• ID: Carry a government photo ID for flights and hotels\n• Tip: Arrive 2–3 hours early for domestic flights`;
      } else {
        response = `• Visa: Check eVisa / visa on arrival eligibility for Indian passport\n• Docs: Passport (6+ months validity), confirmed tickets, hotel proof, funds\n• Timing: Apply 2–6 weeks ahead; verify with the official embassy portal for ${name}`;
      }
    } else if (topic === 'safety') {
      const name = place.city || context?.city || 'destination';
      response = `• Safety score: 7/10 (standard urban precautions in ${name})\n• Tips: Keep valuables concealed; use registered cabs; avoid isolated areas late\n• Emergency: Save local emergency numbers; use hotel safe for passports`;
    } else if (topic === 'weather') {
      const name = place.city || context?.city || 'destination';
      response = `• Nov–Feb: 18–28°C, dry & pleasant\n• Mar–May: 28–38°C, hot afternoons\n• Jun–Sep: Monsoon, heavy rain & humidity\n• Best window: Nov–Feb for comfortable sightseeing in ${name}`;
    } else if (topic === 'sim') {
      const cc = (place.cc || context?.country || '').toString().toUpperCase();
      if (cc === 'IN') {
        response = `• Providers: Jio, Airtel, Vi (good urban coverage)\n• Cost: ₹199–₹599 for 1–4 weeks with 1–2GB/day\n• Where: Airport kiosks, major stores; carry passport for KYC`;
      } else {
        response = `• eSIM: Airalo/Holafly for instant setup (data packs 3–10GB)\n• Local: Buy at airport or city shops; bring passport for registration\n• Tip: Check 4G/5G bands and fair-use policy`;
      }
    } else if (topic.startsWith('itinerary_')) {
      const profile = topic.replace('itinerary_', '');
      const name = place.city || context?.city || 'the city';
      response = `Day 1\n• Morning: Old town walking tour\n• Afternoon: Signature museum & local cafe\n• Evening: Riverside promenade + dinner\n\nDay 2\n• Morning: Iconic landmark + viewpoint\n• Afternoon: Neighborhood food crawl (${profile})\n• Evening: Cultural show or night market\n\nDay 3\n• Morning: Park/temple visit\n• Afternoon: Shopping street or beach time\n• Evening: Sunset spot and farewell dinner`;
    }
  }

  if (response) {
    // Write and return immediately if topic handled
    currentHistory.push({ role: "assistant", content: response });
    conversationMemory.set(conversationId, currentHistory);
    return response;
  }

  // Concierge: best time to visit
  if (message.includes('best time') || message.includes('best months')) {
    const name = place.city || context?.city || 'this destination';
    // Simple seasonal template (works well for many subtropical regions)
    const best = 'Nov–Feb (cooler, drier, pleasant)';
    const avoid = 'Jun–Sep (monsoon; heavy rain and humidity)';
    const notes = 'Mar–Apr can be warm; book early for peak season.';
    response = `• Best months: ${best} for ${name}\n• Avoid: ${avoid}\n• Notes: ${notes}`;
  }
  // Concierge: visa rules (Indian passport)
  else if (message.includes('visa')) {
    const name = place.city || context?.city || 'destination';
    const cc = place.cc || '';
    if (cc === 'IN' || /\b(in(?:dia)?)\b/i.test(raw)) {
      response = `• Visa: Not required for Indian citizens traveling domestically\n• ID: Carry a government photo ID for flights and hotels\n• Tip: Arrive 2–3 hours early for domestic flights`;
    } else {
      response = `• Visa: Check eVisa / visa on arrival eligibility for Indian passport\n• Docs: Passport (6+ months validity), confirmed tickets, hotel proof, funds\n• Timing: Apply 2–6 weeks ahead; verify with the official embassy portal for ${name}`;
    }
  }
  // Concierge: safety
  else if (message.includes('safety')) {
    const name = place.city || context?.city || 'destination';
    response = `• Safety score: 7/10 (standard urban precautions in ${name})\n• Tips: Keep valuables concealed; use registered cabs; avoid isolated areas late\n• Emergency: Save local emergency numbers; use hotel safe for passports`;
  }
  // Concierge: weather
  else if (message.includes('weather')) {
    const name = place.city || context?.city || 'destination';
    response = `• Nov–Feb: 18–28°C, dry & pleasant\n• Mar–May: 28–38°C, hot afternoons\n• Jun–Sep: Monsoon, heavy rain & humidity\n• Best window: Nov–Feb for comfortable sightseeing in ${name}`;
  }
  // Concierge: local SIM
  else if (message.includes('sim')) {
    const cc = place.cc || '';
    if (cc === 'IN') {
      response = `• Providers: Jio, Airtel, Vi (good urban coverage)\n• Cost: ₹199–₹599 for 1–4 weeks with 1–2GB/day\n• Where: Airport kiosks, major stores; carry passport for KYC`;
    } else {
      response = `• eSIM: Airalo/Holafly for instant setup (data packs 3–10GB)\n• Local: Buy at airport or city shops; bring passport for registration\n• Tip: Check 4G/5G bands and fair-use policy`;
    }
  }
  // Greeting responses
  else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    response = "Hello! I'm Voyage AI, your personal travel planning assistant. I can help you plan amazing trips with flights, hotels, and daily itineraries. Where would you like to go?";
  }
  // Help requests
  else if (message.includes('help') || message.includes('what can you do')) {
    response = "I can help you plan complete trips! Just tell me:\n• Where you want to go (destination)\n• When you want to travel (dates)\n• Your budget\n• Your interests (culture, food, shopping, etc.)\n• Number of travelers\n\nI'll create a personalized itinerary with flights, hotels, and daily activities!";
  }
  // Trip planning requests
  else if (message.includes('trip') || message.includes('travel') || message.includes('vacation') || message.includes('holiday') || message.includes('plan')) {
    if (message.includes('paris')) {
      response = "Paris is an amazing destination! I'd love to help you plan your trip to the City of Light. To create the perfect itinerary, I need a few more details:\n\n1. **When** do you want to travel? (dates or season)\n2. **What's your budget?** (approximate amount)\n3. **What interests you?** (culture, food, shopping, nightlife, etc.)\n4. **How many people** are traveling?\n\nOnce you provide these details, I'll create a complete trip plan with flights, hotels, and daily activities!";
    } else {
      response = "Great! I'd love to help you plan your trip. To get started, please tell me:\n\n1. **Where** do you want to go? (city or country)\n2. **When** do you want to travel? (dates or season)\n3. **What's your budget?** (approximate amount)\n4. **What interests you?** (culture, food, shopping, nightlife, beach, etc.)\n5. **How many people** are traveling?\n\nFor example: 'I want to visit Paris in spring with a $2000 budget, love culture and food, traveling with 2 adults'";
    }
  }
  // Destination questions
  else if (message.includes('paris') || message.includes('london') || message.includes('tokyo') || message.includes('new york')) {
    const destination = message.includes('paris') ? 'Paris' : 
                       message.includes('london') ? 'London' :
                       message.includes('tokyo') ? 'Tokyo' : 'New York';
    response = `${destination} is an amazing destination! I can help you plan a complete trip there. What dates are you thinking of traveling? And what's your budget? I'll create a personalized itinerary with the best attractions, restaurants, and activities.`;
  }
  // Budget questions
  else if (message.includes('budget') || message.includes('cost') || message.includes('price')) {
    response = "I can work with any budget! Whether you're looking for a budget-friendly trip or a luxury experience, I'll find the best options for you. What's your approximate budget for this trip?";
  }
  // Interest-based responses
  else if (message.includes('culture') || message.includes('museum') || message.includes('history')) {
    response = "Perfect! I love planning cultural trips. I'll include museums, historical sites, local experiences, and cultural activities in your itinerary. Which destination are you interested in?";
  }
  else if (message.includes('food') || message.includes('restaurant') || message.includes('cuisine')) {
    response = "Food is one of the best parts of traveling! I'll make sure to include amazing local restaurants, food tours, cooking classes, and must-try dishes in your itinerary. Where would you like to explore the local cuisine?";
  }
  else if (message.includes('shopping')) {
    response = "Shopping can be so much fun while traveling! I'll include local markets, shopping districts, and unique stores in your itinerary. What destination are you thinking of for your shopping adventure?";
  }
  // Default response
  else {
    response = "I'm here to help you plan an amazing trip! Could you tell me more about where you'd like to go and when? I can create a complete itinerary with flights, hotels, and daily activities tailored to your interests and budget.";
  }
  
  // Update conversation memory
  currentHistory.push({ role: "assistant", content: response });
  conversationMemory.set(conversationId, currentHistory);
  
  return response;
}

/**
 * Generate intelligent travel recommendations using rule-based system
 */
export async function generateSmartRecommendations(tripData, userPreferences = {}) {
  try {
    const destination = tripData.destination || 'your destination';
    const budget = tripData.budget || 0;
    const interests = tripData.interests || [];
    
    const insights = [
      `${destination} is a fantastic choice for your trip!`,
      "Consider booking flights and hotels in advance for better prices",
      "Check local events and festivals happening during your visit"
    ];
    
    const alternatives = [];
    const optimizations = [];
    const localTips = [];
    
    // Budget-based recommendations
    if (budget < 1000) {
      optimizations.push({
        area: "budget",
        suggestion: "Consider staying in hostels or budget hotels",
        savings: "Save 30-50% on accommodation"
      });
    } else if (budget > 3000) {
      alternatives.push({
        type: "accommodation",
        suggestion: "Luxury hotels with premium amenities",
        reason: "You have budget for premium experiences",
        costImpact: "premium"
      });
    }
    
    // Interest-based recommendations
    if (interests.includes('Culture')) {
      localTips.push("Visit museums early in the morning to avoid crowds");
      alternatives.push({
        type: "activity",
        suggestion: "Guided cultural walking tours",
        reason: "Get deeper insights into local history and culture",
        costImpact: "same"
      });
    }
    
    if (interests.includes('Food')) {
      localTips.push("Try local street food for authentic flavors");
      alternatives.push({
        type: "activity",
        suggestion: "Food tours and cooking classes",
        reason: "Experience local cuisine hands-on",
        costImpact: "same"
      });
    }
    
    if (interests.includes('Shopping')) {
      localTips.push("Visit local markets for unique souvenirs");
      optimizations.push({
        area: "activities",
        suggestion: "Combine shopping with cultural experiences",
        savings: "More value from your time"
      });
    }
    
    // General optimizations
    optimizations.push({
      area: "timing",
      suggestion: "Book activities for weekdays when possible",
      savings: "Lower prices and fewer crowds"
    });
    
    return {
      insights,
      alternatives,
      optimizations,
      localTips
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      insights: ["I'm here to help with your travel planning!"],
      alternatives: [],
      optimizations: [],
      localTips: []
    };
  }
}

/**
 * Analyze and enhance daily itinerary using rule-based system
 */
export async function enhanceItinerary(dailyPlan, destination, interests, weather) {
  try {
    // Enhance each day's activities with additional details
    const enhancedPlan = dailyPlan.map(day => {
      const enhancedBlocks = day.blocks.map(block => ({
        ...block,
        description: `Explore ${block.title} - a must-visit attraction in ${destination}`,
        duration: "2-3 hours",
        cost: "Free - $50",
        tips: [
          "Best visited in the morning",
          "Bring comfortable walking shoes",
          "Check opening hours in advance"
        ],
        transportation: "Walking distance or public transport",
        nearbyRestaurants: "Local cafes and restaurants nearby"
      }));
      
      return {
        ...day,
        blocks: enhancedBlocks,
        weatherAdvice: weather ? `Weather: ${weather.summary}. ${weather.precipitation > 50 ? 'Consider indoor activities.' : 'Perfect for outdoor exploration!'}` : null
      };
    });
    
    return enhancedPlan;
  } catch (error) {
    console.error('Error enhancing itinerary:', error);
    return dailyPlan;
  }
}

/**
 * Generate personalized travel insights using rule-based system
 */
export async function generateTravelInsights(tripHistory, preferences) {
  try {
    const insights = {
      travelPatterns: ["You enjoy exploring new destinations"],
      preferences: ["Cultural experiences and local cuisine"],
      recommendations: ["Consider similar destinations with rich culture"],
      budgetInsights: ["You prefer mid-range accommodations for comfort"],
      seasonalPreferences: ["You travel year-round, adapting to seasons"]
    };
    
    // Analyze trip history if available
    if (tripHistory && tripHistory.length > 0) {
      const destinations = tripHistory.map(trip => trip.destination);
      const uniqueDestinations = [...new Set(destinations)];
      
      if (uniqueDestinations.length > 3) {
        insights.travelPatterns.push("You're an experienced traveler who loves variety");
      }
      
      const avgBudget = tripHistory.reduce((sum, trip) => sum + (trip.budget || 0), 0) / tripHistory.length;
      if (avgBudget > 2000) {
        insights.budgetInsights.push("You prefer comfortable, well-planned trips");
      } else if (avgBudget < 1000) {
        insights.budgetInsights.push("You're great at finding value and budget-friendly options");
      }
    }
    
    return insights;
  } catch (error) {
    console.error('Error generating insights:', error);
    return {
      travelPatterns: ["Exploring new places"],
      preferences: ["Cultural experiences"],
      recommendations: ["Keep exploring!"],
      budgetInsights: ["Good budget management"],
      seasonalPreferences: ["Flexible travel timing"]
    };
  }
}

/**
 * Clear conversation memory
 */
export function clearConversationMemory(conversationId = 'default') {
  conversationMemory.delete(conversationId);
}

/**
 * Get conversation history
 */
export function getConversationHistory(conversationId = 'default') {
  return conversationMemory.get(conversationId) || [];
}

export default {
  extractTravelIntent,
  generateTravelResponse,
  generateSmartRecommendations,
  enhanceItinerary,
  generateTravelInsights,
  clearConversationMemory,
  getConversationHistory
};
