import { useState, useCallback } from "react";

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = "https://settleindash.com/api";

  const createEvent = useCallback(async (eventData) => {
    setLoading(true);
    setError(null);
    console.log("useEvents: Creating event with data:", eventData);

    try {
      const payload = {
        api_key: "2edae9de6810a6d00fe0c6ff9fd3c40869d7c70b9ff7fef72aaf816dad8a9f2d",
        action: "create_event",
        data: {
          title: eventData.title || "",
          category: eventData.category || "",
          event_date: eventData.event_date || "",
          possible_outcomes: eventData.possible_outcomes || [],
          oracle_source: eventData.oracle_source || "",
          event_wallet_address: eventData.event_wallet_address || "",
          signature: eventData.signature || "",
        },
      };
      console.log("useEvents: createEvent request:", JSON.stringify(payload));
      const response = await fetch(`${API_BASE_URL}/events.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("useEvents: createEvent response status:", response.status);
      const result = await response.json();
      console.log("useEvents: createEvent response:", result);
      if (!result.success) {
        throw new Error(result.error || "Failed to create event");
      }
      console.log("useEvents: Event created successfully, event_id:", result.event_id);
      setEvents([...events, { ...eventData, id: result.event_id }]);
      return { success: true, event_id: result.event_id };
    } catch (err) {
      console.error("useEvents: Error creating event:", err.message);
      setError(err.message || "Failed to create event. Please try again.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [events]);

  const getEvents = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    console.log("useEvents: Fetching events with filters:", filters);

    try {
      const query = new URLSearchParams({
        action: "get_events",
        status: filters.status || "open",
      });
      const url = `${API_BASE_URL}/events.php?${query.toString()}`;
      console.log("useEvents: getEvents request:", url);
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      console.log("useEvents: getEvents response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log("useEvents: getEvents response:", result);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch events");
      }
      setEvents(result.data || []);
      console.log("useEvents: Events fetched successfully, count:", result.data?.length || 0);
      return result.data || [];
    } catch (err) {
      console.error("useEvents: Error fetching events:", err.message);
      setError(err.message || "Failed to fetch events. Please try again.");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, createEvent, getEvents, loading, error };
};