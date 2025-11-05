// src/components/Navbar.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  console.log("Navbar rendered ✅");
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center font-bold shadow-sm">
            V
          </div>
          <span className="font-bold tracking-wide text-neutral-900">Voyage AI</span>
        </NavLink>

        {/* Nav Links */}
        <nav className="flex items-center gap-1">
          <NavLink 
            to="/trip-planner" 
            className={({ isActive }) => 
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`
            }
          >
            Trip Planner
          </NavLink>
          <NavLink 
            to="/flights" 
            className={({ isActive }) => 
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`
            }
          >
            Flights
          </NavLink>
          <NavLink 
            to="/hotels" 
            className={({ isActive }) => 
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`
            }
          >
            Hotels
          </NavLink>
          <NavLink 
            to="/destinations" 
            className={({ isActive }) => 
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`
            }
          >
            Destinations
          </NavLink>
          <NavLink 
            to="/trips" 
            className={({ isActive }) => 
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`
            }
          >
            Trips
          </NavLink>
          <NavLink 
            to="/agent-lab" 
            className={({ isActive }) => 
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`
            }
          >
            Agent Lab
          </NavLink>
          <NavLink 
            to="/contact" 
            className={({ isActive }) => 
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`
            }
          >
            Contact
          </NavLink>
          
          {/* User Menu */}
          {isAuthenticated ? (
            <div className="ml-4 flex items-center gap-3">
              <span className="text-sm text-neutral-600">Hi, {user?.name || user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-4 flex items-center gap-2">
              <NavLink
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Sign Up
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
