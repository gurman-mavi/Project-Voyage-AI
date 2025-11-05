// frontend/src/lib/navigation.js
import { useNavigate } from 'react-router-dom';

/**
 * Navigation utilities for auto-filling flight and hotel pages
 */

export function buildFlightsUrl(tripData) {
  const params = new URLSearchParams();
  
  if (tripData.origin) params.set('origin', tripData.origin);
  if (tripData.destination) params.set('dest', tripData.destination);
  if (tripData.dates?.start) params.set('depart', tripData.dates.start);
  if (tripData.dates?.end) params.set('return', tripData.dates.end);
  if (tripData.adults) params.set('adults', tripData.adults);
  if (tripData.cabin) params.set('cabin', tripData.cabin || 'ECONOMY');
  
  return `/flights?${params.toString()}`;
}

export function buildHotelsUrl(tripData) {
  const params = new URLSearchParams();
  
  if (tripData.destination) params.set('city', tripData.destination);
  if (tripData.dates?.start) params.set('checkIn', tripData.dates.start);
  if (tripData.dates?.end) params.set('checkOut', tripData.dates.end);
  if (tripData.adults) params.set('guests', tripData.adults);
  params.set('rooms', '1');
  
  return `/hotels?${params.toString()}`;
}

export function buildDestinationsUrl(searchTerm) {
  const params = new URLSearchParams();
  if (searchTerm) params.set('search', searchTerm);
  return `/destinations?${params.toString()}`;
}

/**
 * Hook for navigation with auto-filled data
 */
export function useTripNavigation() {
  const navigate = useNavigate();
  
  const goToFlights = (tripData) => {
    const url = buildFlightsUrl(tripData);
    navigate(url);
  };
  
  const goToHotels = (tripData) => {
    const url = buildHotelsUrl(tripData);
    navigate(url);
  };
  
  const goToDestinations = (searchTerm) => {
    const url = buildDestinationsUrl(searchTerm);
    navigate(url);
  };
  
  return {
    goToFlights,
    goToHotels,
    goToDestinations,
    buildFlightsUrl,
    buildHotelsUrl,
    buildDestinationsUrl
  };
}

