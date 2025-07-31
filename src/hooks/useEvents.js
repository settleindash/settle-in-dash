// src/hooks/useEvents.js
// Custom hook to handle event-related API calls for Settle In DASH.

import { useState, useCallback } from "react";

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createEvent = useCallback(async (eventData) => {
    setLoading(true);
    setError(null);
    console.log("useEvents: Creating event with data:", eventData);

    try {
      const response = await fetch("https://settleindash.com/api/events.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      console.log("useEvents: Event created successfully:", result);
      return result;
    } catch (err) {
      console.error("useEvents: Error creating event:", err.message);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getEvents = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    console.log("useEvents: Fetching events with filters:", filters);

    try {
      const query = new URLSearchParams(filters).toString();
      const response = await fetch(`https://settleindash.com/api/events.php?${query}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setEvents(result);
      console.log("useEvents: Events fetched successfully:", result);
      return result;
    } catch (err) {
      console.error("useEvents: Error fetching events:", err.message);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, createEvent, getEvents, loading, error };
};