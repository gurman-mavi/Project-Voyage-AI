// Agentic AI Guide Component - Shows intelligent next steps and guidance

import { useState, useEffect } from 'react';

const AGENTIC_STEPS = {
  destination_selected: {
    title: "🎯 Destination Selected!",
    message: "Great choice! Now let's plan your perfect trip.",
    steps: [
      {
        icon: "📅",
        title: "Set Your Dates",
        description: "Choose your travel dates in the form above",
        action: "Go to form tab",
        priority: "high"
      },
      {
        icon: "👥",
        title: "Add Travelers",
        description: "Specify number of adults traveling",
        action: "Update adults field",
        priority: "high"
      },
      {
        icon: "💰",
        title: "Set Budget",
        description: "Define your budget for the trip",
        action: "Set budget amount",
        priority: "medium"
      },
      {
        icon: "🎨",
        title: "Choose Interests",
        description: "Select what you want to do (Culture, Food, Adventure, etc.)",
        action: "Select interests",
        priority: "medium"
      }
    ]
  },
  form_complete: {
    title: "✅ Form Complete!",
    message: "Perfect! You're ready to generate your AI trip plan.",
    steps: [
      {
        icon: "🤖",
        title: "Generate AI Plan",
        description: "Click 'Plan My Trip' to get personalized recommendations",
        action: "Submit form",
        priority: "high"
      },
      {
        icon: "✈️",
        title: "Review Flights",
        description: "Check real flight options and prices",
        action: "View flight results",
        priority: "high"
      },
      {
        icon: "🏨",
        title: "Choose Hotels",
        description: "Select from real hotel options",
        action: "View hotel results",
        priority: "high"
      },
      {
        icon: "📋",
        title: "Customize Itinerary",
        description: "Adjust the daily plan to your preferences",
        action: "Edit itinerary",
        priority: "medium"
      }
    ]
  },
  plan_generated: {
    title: "🎉 Trip Plan Generated!",
    message: "Your personalized trip plan is ready!",
    steps: [
      {
        icon: "🔍",
        title: "Review Options",
        description: "Check the different trip options provided",
        action: "Review plans",
        priority: "high"
      },
      {
        icon: "✈️",
        title: "Book Flights",
        description: "Click 'View Flights' to book your flights",
        action: "Book flights",
        priority: "high"
      },
      {
        icon: "🏨",
        title: "Reserve Hotels",
        description: "Click 'View Hotels' to reserve your accommodation",
        action: "Book hotels",
        priority: "high"
      },
      {
        icon: "💾",
        title: "Save Plan",
        description: "Save this plan for future reference",
        action: "Save trip",
        priority: "medium"
      }
    ]
  }
};

export default function AgenticAIGuide({ 
  currentStep = 'destination_selected', 
  formData = {}, 
  onActionClick = () => {},
  className = "" 
}) {
  const [activeStep, setActiveStep] = useState(currentStep);

  useEffect(() => {
    setActiveStep(currentStep);
  }, [currentStep]);

  // Debug: Log formData to see what we're receiving
  useEffect(() => {
    console.log('AgenticAIGuide formData:', formData);
  }, [formData]);

  const getStepData = () => {
    return AGENTIC_STEPS[activeStep] || AGENTIC_STEPS.destination_selected;
  };

  const handleStepClick = (step) => {
    onActionClick(step.action, step);
  };

  // Calculate actual completion based on form data
  const getCompletedSteps = () => {
    const completed = [];
    
    // Check dates (both start and end must be filled)
    if (formData.start && formData.end && formData.start.trim() !== '' && formData.end.trim() !== '') {
      completed.push('dates');
    }
    
    // Check travelers (must be > 0)
    if (formData.adults && Number(formData.adults) > 0) {
      completed.push('travelers');
    }
    
    // Check budget (must be > 0)
    if (formData.budget && Number(formData.budget) > 0) {
      completed.push('budget');
    }
    
    // Check interests (must have at least one)
    if (formData.interests && Array.isArray(formData.interests) && formData.interests.length > 0) {
      completed.push('interests');
    }
    
    return completed;
  };

  const getProgressPercentage = () => {
    const totalSteps = getStepData().steps.length;
    const completed = getCompletedSteps().length;
    return Math.round((completed / totalSteps) * 100);
  };

  const isStepCompleted = (stepTitle) => {
    const completedSteps = getCompletedSteps();
    if (stepTitle.includes('Dates')) return completedSteps.includes('dates');
    if (stepTitle.includes('Travelers')) return completedSteps.includes('travelers');
    if (stepTitle.includes('Budget')) return completedSteps.includes('budget');
    if (stepTitle.includes('Interests')) return completedSteps.includes('interests');
    return false;
  };

  const stepData = getStepData();

  const progress = getProgressPercentage();
  const completedCount = getCompletedSteps().length;
  const totalSteps = getStepData().steps.length;

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border border-blue-200 p-4 ${className}`}>
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-blue-900 mb-1">{stepData.title}</h3>
        <p className="text-sm text-blue-700">{stepData.message}</p>
        
        {/* Progress Bar with Clear Info */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-blue-600 mb-1">
            <span>Your Progress</span>
            <span className="font-semibold">{completedCount} of {totalSteps} completed ({progress}%)</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {progress === 0 && (
            <p className="text-xs text-blue-600 mt-2 text-center">👇 Complete the steps below to plan your trip</p>
          )}
          {progress === 100 && (
            <p className="text-xs text-green-600 mt-2 text-center font-semibold">🎉 All done! Click "Plan My Trip" to continue</p>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {stepData.steps.map((step, index) => (
          <div
            key={index}
            onClick={() => handleStepClick(step)}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              isStepCompleted(step.title)
                ? 'bg-white border-green-400 opacity-60 cursor-default'
                : step.priority === 'high'
                ? 'bg-white border-red-200 hover:border-red-400 hover:shadow-md'
                : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className={`text-xl ${step.priority === 'high' && !isStepCompleted(step.title) ? 'animate-pulse' : ''}`}>
                {isStepCompleted(step.title) ? '✓' : step.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${isStepCompleted(step.title) ? 'text-green-600' : 'text-slate-900'}`}>{step.title}</h4>
                  {!isStepCompleted(step.title) && step.priority === 'high' && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                      !
                    </span>
                  )}
                  {isStepCompleted(step.title) && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                      Done
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">{step.description}</p>
                <div className="mt-1">
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                    {step.action}
                  </span>
                </div>
              </div>
              <div className="text-blue-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights - More Helpful */}
      <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🤖</span>
          <h4 className="text-sm font-semibold text-slate-900">What This Page Does</h4>
        </div>
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-medium">✓ This is your AI Trip Planning Assistant</p>
          <p>• Fill the form on the left (dates, travelers, budget, interests)</p>
          <p>• Watch your progress update in real-time</p>
          <p>• When 100% complete, click "Plan My Trip" button</p>
          <p>• AI will find real flights, hotels, and create itinerary</p>
          {progress === 100 && (
            <p className="text-green-600 font-semibold mt-2">→ Ready! Go to Form tab and click "Plan My Trip"</p>
          )}
          {progress < 100 && (
            <p className="text-orange-600 font-semibold mt-2">→ Complete {totalSteps - completedCount} more step{totalSteps - completedCount !== 1 ? 's' : ''} above</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onActionClick('view_form')}
          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          📝 Form
        </button>
        <button
          onClick={() => onActionClick('view_ai_chat')}
          className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
        >
          🤖 Chat
        </button>
      </div>
    </div>
  );
}
