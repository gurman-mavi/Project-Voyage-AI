import React from "react";
import GoToFlightsButton from "./components/GoToFlightsButton";

export default function TestFlights() {
  return (
    <div style={{ padding: "2rem" }}>
      <h2>Test Flight Button</h2>
      <GoToFlightsButton
        data={{
          from: "DEL",          // origin airport
          to: "LHR",            // destination airport
          date: "2025-09-27",   // departure date
          ret: "2025-10-03",    // return date (or "")
          currency: "INR"       // display currency
        }}
        className="btn btn-primary"
      >
        See flight offers
      </GoToFlightsButton>
    </div>
  );
}
