// src/components/GoToFlightsButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { makeFlightsUrl } from "../lib/makeFlightsUrl.js"; // note the .js and path

export default function GoToFlightsButton({
  data,
  className = "",
  children = "Search flights",
}) {
  const navigate = useNavigate();

  function handleClick() {
    const url = makeFlightsUrl(data);
    navigate(url);
  }

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
