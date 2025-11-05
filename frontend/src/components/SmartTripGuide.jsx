// Smart Trip Guide - Actually useful AI assistant that guides users step by step
import { useState, useEffect } from 'react';

export default function SmartTripGuide({ 
  formData = {}, 
  onActionClick = () => {},
  className = "" 
}) {
  const [currentFocus, setCurrentFocus] = useState('destination');

  // Determine what the user should do next
  useEffect(() => {
    if (!formData.destination) {
      setCurrentFocus('destination');
    } else if (!formData.start || !formData.end) {
      setCurrentFocus('dates');
    } else if (!formData.adults || formData.adults === 0) {
      setCurrentFocus('travelers');
    } else if (!formData.budget || formData.budget === 0) {
      setCurrentFocus('budget');
    } else if (!formData.interests || formData.interests.length === 0) {
      setCurrentFocus('interests');
    } else {
      setCurrentFocus('ready');
    }
  }, [formData]);

  const getProgress = () => {
    let completed = 0;
    if (formData.destination) completed++;
    if (formData.start && formData.end) completed++;
    if (formData.adults > 0) completed++;
    if (formData.budget > 0) completed++;
    if (formData.interests?.length > 0) completed++;
    return { completed, total: 5, percentage: Math.round((completed / 5) * 100) };
  };

  const progress = getProgress();

  const getMainMessage = () => {
    if (currentFocus === 'destination') {
      return {
        icon: '🎯',
        title: 'Where do you want to go?',
        message: 'Start by selecting your destination from the form',
        action: 'Select Destination',
        actionType: 'view_form'
      };
    }
    if (currentFocus === 'dates') {
      return {
        icon: '📅',
        title: 'When are you traveling?',
        message: `Great! You selected ${formData.destination}. Now pick your travel dates.`,
        action: 'Set Dates',
        actionType: 'view_form'
      };
    }
    if (currentFocus === 'travelers') {
      return {
        icon: '👥',
        title: 'How many travelers?',
        message: 'Specify the number of adults traveling',
        action: 'Add Travelers',
        actionType: 'view_form'
      };
    }
    if (currentFocus === 'budget') {
      return {
        icon: '💰',
        title: 'What\'s your budget?',
        message: 'Set your total trip budget to get personalized recommendations',
        action: 'Set Budget',
        actionType: 'view_form'
      };
    }
    if (currentFocus === 'interests') {
      return {
        icon: '🎨',
        title: 'What interests you?',
        message: 'Choose activities you enjoy (Culture, Food, Adventure, etc.)',
        action: 'Choose Interests',
        actionType: 'view_form'
      };
    }
    return {
      icon: '🎉',
      title: 'Ready to plan!',
      message: 'All set! Click "Plan My Trip" to get AI-powered recommendations',
      action: 'Plan My Trip',
      actionType: 'submit_form'
    };
  };

  const mainMessage = getMainMessage();

  return (
    <div className={`bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-indigo-200 p-5 ${className}`}>
      {/* Progress Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-neutral-700">Trip Planning Progress</h3>
          <span className="text-xs font-bold text-indigo-600">
            {progress.completed}/5 Steps
          </span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Main Action Card */}
      <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-indigo-300 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-4xl">{mainMessage.icon}</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">
              {mainMessage.title}
            </h2>
            <p className="text-sm text-neutral-600 mb-3">
              {mainMessage.message}
            </p>
            <button
              onClick={() => onActionClick(mainMessage.actionType)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105"
            >
              {mainMessage.action} →
            </button>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-neutral-600 mb-2">Your Checklist:</h4>
        
        <ChecklistItem
          icon="🎯"
          label="Destination"
          completed={!!formData.destination}
          value={formData.destination}
        />
        <ChecklistItem
          icon="📅"
          label="Travel Dates"
          completed={!!(formData.start && formData.end)}
          value={formData.start && formData.end ? `${formData.start} to ${formData.end}` : null}
        />
        <ChecklistItem
          icon="👥"
          label="Travelers"
          completed={formData.adults > 0}
          value={formData.adults > 0 ? `${formData.adults} adult${formData.adults > 1 ? 's' : ''}` : null}
        />
        <ChecklistItem
          icon="💰"
          label="Budget"
          completed={formData.budget > 0}
          value={formData.budget > 0 ? `₹${formData.budget.toLocaleString()}` : null}
        />
        <ChecklistItem
          icon="🎨"
          label="Interests"
          completed={formData.interests?.length > 0}
          value={formData.interests?.length > 0 ? `${formData.interests.length} selected` : null}
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-indigo-200 flex gap-2">
        <button
          onClick={() => onActionClick('view_form')}
          className="flex-1 py-2 px-3 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
        >
          📝 Form
        </button>
        <button
          onClick={() => onActionClick('view_ai_chat')}
          className="flex-1 py-2 px-3 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
        >
          💬 AI Chat
        </button>
      </div>
    </div>
  );
}

function ChecklistItem({ icon, label, completed, value }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
      completed ? 'bg-green-50 border border-green-200' : 'bg-neutral-50 border border-neutral-200'
    }`}>
      <div className="text-lg">{completed ? '✅' : icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-neutral-700">{label}</div>
        {value && (
          <div className="text-xs text-neutral-500 truncate">{value}</div>
        )}
        {!completed && (
          <div className="text-xs text-neutral-400">Not set</div>
        )}
      </div>
      {completed && (
        <div className="text-xs font-semibold text-green-600">Done</div>
      )}
    </div>
  );
}
