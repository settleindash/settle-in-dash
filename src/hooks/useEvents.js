// src/hooks/useEvents.js
import { useState, useCallback, useMemo } from "react";

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = "https://settleindash.com/api/events.php";

  const call = async (action, data = {}) => {
    console.log("useEvents.call → action:", action, "data:", data);
    const payload = { action, data };
    const resp = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await resp.json();
    console.log("useEvents.call → response:", result);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    if (!result.success) throw new Error(result.error || "Failed");
    return result;
  };

  const createEvent = useCallback(async (eventData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await call("create_event", eventData);
      return { success: true, event_id: result.event_id };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // FIXED: fetchEvents must be memoized with useCallback
  const fetchEvents = useCallback(async (filters = {}) => {
    console.log("fetchEvents called with filters:", filters);
    setLoading(true);
    setError(null);
    try {
      const result = await call("get_events", { 
        status: filters.status ?? "open", 
        event_id: filters.event_id 
      });
      setEvents(result.data || []);
      return result.data || [];
    } catch (err) {
      console.error("fetchEvents failed:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getEvents = fetchEvents;

  const getEvent = useCallback(async (event_id) => {
  if (!event_id) return null;
  try {
    const data = await fetchEvents({ event_id }); // calls backend with event_id
    const event = data.find(e => e.event_id === event_id);
    return event || null;
  } catch (err) {
    console.error("getEvent failed:", err);
    return null;
  }
}, [fetchEvents]);


  return useMemo(() => ({
    events,
    createEvent,
    getEvents,
    getEvent,
    loading,
    error,
  }), [events, createEvent, getEvents, getEvent, loading, error]);
};