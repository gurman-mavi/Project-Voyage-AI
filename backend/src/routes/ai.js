// backend/src/routes/ai.js
import express from "express";
import { 
  extractTravelIntent, 
  generateTravelResponse, 
  generateSmartRecommendations,
  enhanceItinerary,
  generateTravelInsights,
  clearConversationMemory,
  getConversationHistory
} from "../ai/aiService.js";

const router = express.Router();

// Simple test route first
router.get('/test', (req, res) => {
  res.json({ message: 'AI routes are working!' });
});

/**
 * POST /api/ai/chat
 * Conversational AI endpoint for travel planning
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, conversationId = 'default', context = {} } = req.body;
    // Debug: confirm context received
    try { console.log("/api/ai/chat: topic=", context?.topic, "city=", context?.city, "country=", context?.country); } catch {}
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: "Message is required and must be a string" 
      });
    }

    // Generate AI response
    const response = await generateTravelResponse(message, conversationId, context);
    
    // Try to extract travel intent from the message
    const intent = await extractTravelIntent(message, conversationId);
    
    res.json({
      success: true,
      response,
      intent,
      conversationId,
      topic: context?.topic || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      error: "Failed to process your message. Please try again." 
    });
  }
});

/**
 * POST /api/ai/extract-intent
 * Extract structured travel information from natural language
 */
router.post("/extract-intent", async (req, res) => {
  try {
    const { message, conversationId = 'default' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: "Message is required and must be a string" 
      });
    }

    const intent = await extractTravelIntent(message, conversationId);
    
    res.json({
      success: true,
      intent,
      conversationId
    });
  } catch (error) {
    console.error('Intent extraction error:', error);
    res.status(500).json({ 
      error: "Failed to extract travel intent. Please try again." 
    });
  }
});

/**
 * POST /api/ai/recommendations
 * Generate smart travel recommendations
 */
router.post("/recommendations", async (req, res) => {
  try {
    const { tripData, userPreferences = {} } = req.body;
    
    if (!tripData) {
      return res.status(400).json({ 
        error: "Trip data is required" 
      });
    }

    const recommendations = await generateSmartRecommendations(tripData, userPreferences);
    
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ 
      error: "Failed to generate recommendations. Please try again." 
    });
  }
});

/**
 * POST /api/ai/enhance-itinerary
 * Enhance daily itinerary with detailed information
 */
router.post("/enhance-itinerary", async (req, res) => {
  try {
    const { dailyPlan, destination, interests, weather } = req.body;
    
    if (!dailyPlan || !destination) {
      return res.status(400).json({ 
        error: "Daily plan and destination are required" 
      });
    }

    const enhancedItinerary = await enhanceItinerary(dailyPlan, destination, interests, weather);
    
    res.json({
      success: true,
      enhancedItinerary
    });
  } catch (error) {
    console.error('Itinerary enhancement error:', error);
    res.status(500).json({ 
      error: "Failed to enhance itinerary. Please try again." 
    });
  }
});

/**
 * POST /api/ai/insights
 * Generate personalized travel insights
 */
router.post("/insights", async (req, res) => {
  try {
    const { tripHistory = [], preferences = {} } = req.body;

    const insights = await generateTravelInsights(tripHistory, preferences);
    
    res.json({
      success: true,
      insights
    });
  } catch (error) {
    console.error('Insights generation error:', error);
    res.status(500).json({ 
      error: "Failed to generate insights. Please try again." 
    });
  }
});

/**
 * GET /api/ai/conversation/:conversationId
 * Get conversation history
 */
router.get("/conversation/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const history = getConversationHistory(conversationId);
    
    res.json({
      success: true,
      conversationId,
      history
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ 
      error: "Failed to get conversation history." 
    });
  }
});

/**
 * DELETE /api/ai/conversation/:conversationId
 * Clear conversation memory
 */
router.delete("/conversation/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    clearConversationMemory(conversationId);
    
    res.json({
      success: true,
      message: "Conversation cleared successfully"
    });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ 
      error: "Failed to clear conversation." 
    });
  }
});

/**
 * GET /api/ai/status
 * Check AI service status
 */
router.get("/status", async (req, res) => {
  try {
    res.json({
      success: true,
      status: "AI service is running",
      features: [
        "Natural language processing",
        "Travel intent extraction", 
        "Conversational responses",
        "Smart recommendations",
        "Itinerary enhancement",
        "Travel insights"
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: "AI service status check failed" 
    });
  }
});

export default router;

