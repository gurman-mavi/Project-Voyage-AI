/**
 * Multi-Agent Collaboration System
 * Multiple specialized AI agents working together to plan trips
 */

import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = 'llama-3.3-70b-versatile'; // Updated to current Groq model

/**
 * Budget Agent - Analyzes costs and provides budget recommendations
 */
async function budgetAgent({ destination, budget, duration, flightPrice, hotelPrice }) {
  const totalSpent = (flightPrice || 0) + (hotelPrice || 0);
  const dailyBudget = budget / duration;
  const remaining = budget - totalSpent;
  
  const prompt = `You are a Budget Agent specializing in travel finance.

Trip Details:
- Destination: ${destination}
- Total Budget: $${budget} USD
- Duration: ${duration} days
- Flight Cost: $${flightPrice || 0} USD
- Hotel Cost: $${hotelPrice || 0} USD
- Total Spent: $${totalSpent} USD
- Remaining: $${remaining} USD
- Daily Budget Available: $${Math.floor(remaining / duration)} USD

Analyze the budget and provide:
1. Budget health status (under/over/on-track)
2. Daily spending recommendation
3. Cost-saving tips specific to ${destination}
4. Warning if overspending

Keep response concise (4-5 bullets). Be specific with numbers in USD.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  return {
    agent: 'budget',
    analysis: completion.choices[0].message.content,
    metrics: {
      totalBudget: budget,
      spent: totalSpent,
      remaining,
      dailyBudget: Math.floor(remaining / duration),
      status: remaining > budget * 0.3 ? 'healthy' : 'warning'
    }
  };
}

/**
 * Weather Agent - Analyzes weather and suggests activity timing
 */
async function weatherAgent({ destination, dates }) {
  const { start, end } = dates;
  
  const prompt = `You are a Weather Agent specializing in travel meteorology.

Trip Details:
- Destination: ${destination}
- Travel Dates: ${start} to ${end}

Provide:
1. Expected weather conditions for these dates
2. Best days for outdoor activities
3. Days to avoid outdoor plans (rain/extreme weather)
4. Packing recommendations based on weather
5. Any weather-related warnings or tips

Keep response concise (4-5 bullets). Be specific about dates if possible.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  return {
    agent: 'weather',
    analysis: completion.choices[0].message.content,
    recommendation: 'Check forecast 3 days before travel'
  };
}

/**
 * Activity Agent - Suggests activities based on interests and constraints
 */
async function activityAgent({ destination, interests, budget, duration, dates }) {
  const interestsList = Array.isArray(interests) ? interests.join(', ') : 'general sightseeing';
  
  const prompt = `You are an Activity Agent specializing in travel experiences.

Trip Details:
- Destination: ${destination}
- Duration: ${duration} days
- Interests: ${interestsList}
- Daily Activity Budget: ~${Math.floor(budget / duration / 3)} INR
- Travel Dates: ${dates.start} to ${dates.end}

Suggest:
1. Top 3 must-do activities matching interests
2. Hidden gems locals recommend
3. Free/budget-friendly options
4. Activities to book in advance
5. Optimal timing for each activity

Keep response concise (5-6 bullets). Include approximate costs.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  return {
    agent: 'activity',
    analysis: completion.choices[0].message.content,
    categories: interests || []
  };
}

/**
 * Coordinator Agent - Orchestrates all agents and creates unified plan
 */
async function coordinatorAgent({ tripData, agentResults }) {
  const { destination, budget, duration, dates } = tripData;
  
  const budgetAnalysis = agentResults.find(r => r.agent === 'budget')?.analysis || 'No budget analysis';
  const weatherAnalysis = agentResults.find(r => r.agent === 'weather')?.analysis || 'No weather analysis';
  const activityAnalysis = agentResults.find(r => r.agent === 'activity')?.analysis || 'No activity analysis';
  
  const prompt = `You are the Coordinator Agent. Three specialized agents have analyzed this trip:

TRIP: ${destination} | ${duration} days | Budget: ${budget} INR | ${dates.start} to ${dates.end}

BUDGET AGENT REPORT:
${budgetAnalysis}

WEATHER AGENT REPORT:
${weatherAnalysis}

ACTIVITY AGENT REPORT:
${activityAnalysis}

Your task: Synthesize these reports into a unified, actionable travel plan.

Provide:
1. **Executive Summary** (2-3 sentences on trip viability)
2. **Key Recommendations** (3-4 prioritized action items)
3. **Day-by-Day Strategy** (brief outline considering weather + budget)
4. **Warnings & Alerts** (any concerns from agents)
5. **Pro Tips** (2-3 insider tips combining agent insights)

Format with clear sections. Be concise but actionable.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  return {
    agent: 'coordinator',
    unifiedPlan: completion.choices[0].message.content,
    timestamp: new Date().toISOString()
  };
}

/**
 * Main Multi-Agent System
 * Orchestrates all agents in sequence
 */
export async function runMultiAgentSystem(tripData) {
  try {
    console.log('🤖 Multi-Agent System: Starting analysis...');
    
    // Run specialized agents in parallel
    const [budgetResult, weatherResult, activityResult] = await Promise.all([
      budgetAgent({
        destination: tripData.destination,
        budget: tripData.budget || 50000,
        duration: tripData.duration || 5,
        flightPrice: tripData.flightPrice || 0,
        hotelPrice: tripData.hotelPrice || 0
      }),
      weatherAgent({
        destination: tripData.destination,
        dates: tripData.dates || { start: 'TBD', end: 'TBD' }
      }),
      activityAgent({
        destination: tripData.destination,
        interests: tripData.interests || [],
        budget: tripData.budget || 50000,
        duration: tripData.duration || 5,
        dates: tripData.dates || { start: 'TBD', end: 'TBD' }
      })
    ]);

    console.log('✅ Specialized agents completed');

    // Run coordinator agent to synthesize results
    const coordinatorResult = await coordinatorAgent({
      tripData,
      agentResults: [budgetResult, weatherResult, activityResult]
    });

    console.log('✅ Coordinator agent completed');

    return {
      success: true,
      agents: {
        budget: budgetResult,
        weather: weatherResult,
        activity: activityResult,
        coordinator: coordinatorResult
      },
      summary: {
        destination: tripData.destination,
        analyzedAt: new Date().toISOString(),
        agentsUsed: ['budget', 'weather', 'activity', 'coordinator']
      }
    };

  } catch (error) {
    console.error('❌ Multi-Agent System error:', error);
    return {
      success: false,
      error: error.message,
      agents: {}
    };
  }
}

/**
 * Quick analysis for existing trips (lighter version)
 */
export async function quickMultiAgentAnalysis(tripData) {
  try {
    // Run only budget and activity agents for speed
    const [budgetResult, activityResult] = await Promise.all([
      budgetAgent({
        destination: tripData.destination,
        budget: tripData.budget || 50000,
        duration: tripData.duration || 5,
        flightPrice: tripData.flightPrice || 0,
        hotelPrice: tripData.hotelPrice || 0
      }),
      activityAgent({
        destination: tripData.destination,
        interests: tripData.interests || [],
        budget: tripData.budget || 50000,
        duration: tripData.duration || 5,
        dates: tripData.dates || { start: 'TBD', end: 'TBD' }
      })
    ]);

    return {
      success: true,
      agents: {
        budget: budgetResult,
        activity: activityResult
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
