// frontend/src/components/AnimatedLoader.jsx
import { useState, useEffect } from 'react';

export default function AnimatedLoader({ message = "Planning your trip...", showSteps = true }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    "Analyzing your preferences...",
    "Searching for flights...",
    "Finding perfect hotels...",
    "Creating daily itinerary...",
    "Adding local recommendations...",
    "Finalizing your plan..."
  ];

  useEffect(() => {
    if (!showSteps) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [showSteps, steps.length]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200">
      {/* Animated Logo */}
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20 animate-pulse"></div>
      </div>

      {/* Main Message */}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{message}</h3>
      
      {/* Progress Steps */}
      {showSteps && (
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-4">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-500 ${
                    index <= currentStep 
                      ? 'bg-indigo-500 scale-125' 
                      : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-slate-600 animate-pulse">
              {steps[currentStep]}
            </p>
          </div>
        </div>
      )}

      {/* Animated Dots */}
      <div className="flex space-x-1 mt-4">
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
}

export function TripCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse">
      <div className="h-48 bg-gradient-to-r from-slate-200 to-slate-300"></div>
      <div className="p-6 space-y-4">
        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded"></div>
          <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          <div className="h-4 bg-slate-200 rounded w-4/6"></div>
        </div>
        <div className="h-10 bg-slate-200 rounded-xl"></div>
      </div>
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-slate-100">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
