// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar.jsx"; // <-- EXACT name & case
import Home from "./Home.jsx";
import Flights from "./Flights.jsx";
import Destinations from "./Destinations.jsx";
import Contact from "./Contact.jsx";
// at top with other imports
import Hotels from './Hotels.jsx';
import TripPlanner from "./TripPlanner.jsx";
import EnhancedTripPlanner from "./components/EnhancedTripPlanner.jsx";
import UltraModernTripPlanner from "./components/UltraModernTripPlanner.jsx";
import TestFlights from "./TestFlights";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import Trips from "./Trips.jsx";
import { TripCartProvider } from "./contexts/TripCartContext.jsx";
import Finalize from "./Finalize.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import AgentLab from "./AgentLab.jsx";

function ErrorBoundary({ children }) {
  const [err, setErr] = React.useState(null);
  return err
    ? (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-4">
          <div className="font-semibold mb-1">This page failed to render</div>
          <div className="text-sm break-all">{String(err?.message || err)}</div>
        </div>
      </div>
    )
    : (
      <React.Suspense fallback={null}>
        <ErrorCatcher onError={setErr}>{children}</ErrorCatcher>
      </React.Suspense>
    );
}
class ErrorCatcher extends React.Component {
  componentDidCatch(error) { this.props.onError?.(error); }
  render() { return this.props.children; }
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <TripCartProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={
              <div className="min-h-screen bg-neutral-50 text-neutral-900">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/flights" element={<Flights />} />
                    <Route path="/destinations" element={<ErrorBoundary><Destinations /></ErrorBoundary>} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/hotels" element={<Hotels />} />
                    <Route path="/trip-planner" element={<UltraModernTripPlanner />} />
                    <Route path="/trips" element={<Trips />} />
                    <Route path="/trip-planner-old" element={<TripPlanner />} />
                    <Route path="/test" element={<TestFlights />} />
                    <Route path="/finalize" element={<ErrorBoundary><Finalize /></ErrorBoundary>} />
                    <Route path="/agent-lab" element={<AgentLab />} />
                    <Route path="*" element={<Home />} />
                  </Routes>
                </div>
              </div>
            } />
          </Routes>
        </TripCartProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
