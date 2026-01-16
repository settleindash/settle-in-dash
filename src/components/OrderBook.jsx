// src/components/OrderBook.jsx
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import { formatCustomDate } from "../utils/validation";
import FilterContracts from "../components/FilterContracts";
import PageHeader from "../utils/formats/PageHeader.jsx";

const OrderBook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const event_id = query.get("event_id");
  const selectedOutcome = query.get("outcome");

  const { contracts, fetchContracts, loading, error } = useContracts();
  const { events, getEvents } = useEvents();

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");

  // Fetch contracts for this event
  useEffect(() => {
    if (event_id) {
      fetchContracts({ event_id, status: null });
    }
  }, [event_id, fetchContracts]);

  // Fetch/display event details
  useEffect(() => {
    if (!event_id) return;

    const found = events.find((e) => e.event_id === event_id);
    if (found) {
      setEventTitle(found.title || "Event Not Found");
      setEventDate(found.event_date || "");
    } else {
      getEvents({ status: "open" });
    }
  }, [event_id, events, getEvents]);

  // Refresh handler
  const handleRefresh = () => {
    if (event_id) {
      fetchContracts({ event_id, status: "open" });
    }
  };

  // No event ID → show fallback
  if (!event_id) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <PageHeader title="Order Book" />
        <p className="text-gray-600 text-lg mb-6">
          No event selected. Please choose an event from the marketplace.
        </p>
        <button
          onClick={() => navigate("/marketplace")}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700"
        >
          Browse Events
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700">Loading order book...</p>
          <p className="text-gray-500 mt-2">Fetching open contracts for this event</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <PageHeader title="Order Book" />
        <main className="max-w-3xl mx-auto mt-6 text-center">
          <p className="text-red-600 text-lg font-medium">{error}</p>
          <button
            onClick={() => navigate("/marketplace")}
            className="mt-6 bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700"
          >
            Back to Marketplace
          </button>
        </main>
      </div>
    );
  }

  // Calculate total liquidity for display
  const totalLiquidity = contracts.reduce((sum, c) => sum + Number(c.stake || 0), 0).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={`Order Book: ${eventTitle || "Loading..."}`} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Event Info & Instructions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-blue-800 mb-3">How to Use the Order Book</h3>
            <p className="text-sm text-gray-700">
              View available sell contracts sorted by highest odds first. Click any odds to view or accept the contract.
              Create your own sell position below.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-blue-800 mb-3">Event Details</h3>
            <p className="text-sm mb-2">
              <strong>Title:</strong> {eventTitle || "N/A"}
            </p>
                    
            <p className="text-sm">
              <strong>Date:</strong>{" "}
              {formatCustomDate(eventDate)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Shown in your local time zone (stored in UTC) ({Intl.DateTimeFormat().resolvedOptions().timeZone})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => event_id && navigate(`/create-contract?event_id=${event_id}`)}
            disabled={!event_id}
            className="flex-1 bg-orange-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50"
          >
            Create New Contract
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex-1 bg-blue-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Main Order Book Table */}
        <FilterContracts
          contracts={contracts || []}
          viewMode="orderbook"
          eventId={event_id}
          renderContent={null} // Use internal orderbook rendering
          showFilters={true}
          showPastDeadlineOption={true} 
        />

        {/* Liquidity Summary */}
        <div className="mt-6 text-center text-lg font-semibold text-green-700">
          Total Open Liquidity: {totalLiquidity} DASH
        </div>

        {/* Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => navigate("/marketplace")}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700"
          >
            Back to Marketplace
          </button>
        </div>
      </main>
    </div>
  );
};

export default OrderBook;