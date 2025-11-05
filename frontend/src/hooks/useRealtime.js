// React hook for real-time updates

import { useEffect, useState, useRef } from 'react';
import realtimeService from '../lib/realtimeService.js';

export function useRealtime(type, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    unsubscribeRef.current = realtimeService.subscribe(type, (newData, opts) => {
      if (newData.error) {
        setError(newData.error);
      } else {
        setData(newData);
        setError(null);
      }
      setLastUpdate(new Date());
      setLoading(false);
    }, options);

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [type, JSON.stringify(options)]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refetch: () => {
      setLoading(true);
      // Trigger immediate update
      realtimeService.updateSubscribers(type);
    }
  };
}

// Specific hooks for different data types
export function usePriceUpdates(destination = null) {
  return useRealtime('price', { destination });
}

export function useWeatherUpdates(destination = null) {
  return useRealtime('weather', { destination });
}

export function usePriceAlerts() {
  return useRealtime('alerts');
}

export function useDynamicSuggestions() {
  return useRealtime('suggestions');
}

// Hook for multiple real-time subscriptions
export function useMultipleRealtime(subscriptions) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const unsubscribeRefs = useRef({});

  useEffect(() => {
    setLoading(true);
    setData({});
    setErrors({});

    // Subscribe to all types
    subscriptions.forEach(({ type, options = {} }) => {
      unsubscribeRefs.current[type] = realtimeService.subscribe(type, (newData, opts) => {
        setData(prev => ({
          ...prev,
          [type]: newData
        }));

        if (newData.error) {
          setErrors(prev => ({
            ...prev,
            [type]: newData.error
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[type];
            return newErrors;
          });
        }

        setLoading(false);
      }, options);
    });

    // Cleanup on unmount
    return () => {
      Object.values(unsubscribeRefs.current).forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
      unsubscribeRefs.current = {};
    };
  }, [JSON.stringify(subscriptions)]);

  return {
    data,
    loading,
    errors,
    refetch: (type) => {
      if (type) {
        realtimeService.updateSubscribers(type);
      } else {
        subscriptions.forEach(({ type }) => {
          realtimeService.updateSubscribers(type);
        });
      }
    }
  };
}

