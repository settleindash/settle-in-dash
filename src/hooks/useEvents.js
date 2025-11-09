// src/hooks/useEvents.js
import { useState, useCallback, useMemo } from "react";

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = "https://settleindash.com/api";

  const createEvent = useCallback(async (eventData) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        action: "create_event",
        data: {
          title: eventData.title ?? "",
          category: eventData.category ?? "",
          event_date: eventData.event_date ?? "",
          possible_outcomes: eventData.possible_outcomes ?? [],
          oracle_source: eventData.oracle_source ?? "",
          event_wallet_address: eventData.event_wallet_address ?? "",
          signature: eventData.signature ?? "",
        },
      };

      const resp = await fetch(`${API_BASE}/events.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await resp.json();
      if (!result.success) throw new Error(result.error ?? "Failed to create event");

      setEvents((prev) => [...prev, { ...eventData, id: result.event_id }]);
      return { success: true, event_id: result.event_id };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        action: "get_events",
        status: filters.status ?? "open",
        ...(filters.event_id && { event_id: filters.event_id }),
      });

      const resp = await fetch(`${API_BASE}/events.php?${qs}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await resp.json();
      if (!result.success) throw new Error(result.error ?? "Failed to fetch events");

      setEvents(result.data ?? []);
      return result.data ?? [];
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getEvents = useCallback(fetchEvents, []);
  const getEvent = useCallback(async (event_id) => {
    if (!event_id) return null;
    const data = await fetchEvents({ event_id });
    return data?.[0] ?? null;
  }, []);

  return useMemo(
    () => ({
      events,
      createEvent,
      getEvents,
      getEvent,
      loading,
      error,
    }),
    [events, createEvent, getEvents, getEvent, loading, error]
  );
};

export default useEvents;