// src/components/FilterContracts.jsx
// Enhanced: Multi-field search, multi-status, orderbook mode, better stats, robust

import { useState, useEffect, useMemo, useCallback } from "react";
import debounce from "lodash/debounce";
import { Link } from "react-router-dom";

const FilterContracts = ({
  contracts,
  onFilterChange,
  contractsPerPage = 20,
  renderContent,
  showFilters = true,
  viewMode = "list", // "list" or "orderbook"
  eventId, // Optional: pre-filter by event
  onRefresh, // Optional: callback for refresh button
  showPastDeadlineOption = false,
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    viewMode === "orderbook" ? ["open"] : []
  );
  const [sortBy, setSortBy] = useState(
    viewMode === "orderbook" ? { field: "odds", direction: "desc" } : { field: "created_at", direction: "desc" }
  );
  const [page, setPage] = useState(1);
  const [showPastDeadline, setShowPastDeadline] = useState(false); 

  const debouncedSetSearch = useCallback(debounce(setDebouncedSearch, 300), []);

  useEffect(() => {
    debouncedSetSearch(search);
    setPage(1);
  }, [search, debouncedSetSearch]);

  //const now = useMemo(() => new Date(), []); OLD
const now = new Date();

  const filteredContracts = useMemo(() => {
    let result = (contracts || []).filter((c) => {
      const lowerSearch = debouncedSearch.toLowerCase().trim();

      const matchesSearch =
        !lowerSearch ||
        [
          c.eventTitle,
          c.contract_id,
          c.WalletAddress,
          c.accepterWalletAddress,
          c.multisig_address,
          c.new_multisig_address,
        ].some((v) => (v || "").toLowerCase().includes(lowerSearch));

      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(c.status);

      const matchesEvent = !eventId || c.event_id === eventId;

      // Deadline check — only apply if not showing past deadlines
      let isWithinDeadline = true;
      if (!showPastDeadlineOption || !showPastDeadline) {
        isWithinDeadline = !c.acceptanceDeadline || new Date(c.acceptanceDeadline + 'Z') > now;
      }

      return matchesSearch && matchesStatus && matchesEvent && isWithinDeadline;
    });

    // Sort
    result = result.sort((a, b) => {
      if (!sortBy.field) return 0;
      let valA = a[sortBy.field] ?? (sortBy.field === "odds" ? 0 : "");
      let valB = b[sortBy.field] ?? (sortBy.field === "odds" ? 0 : "");
      if (sortBy.field === "created_at" || sortBy.field === "acceptanceDeadline") {
        valA = new Date(valA);
        valB = new Date(valB);
        return sortBy.direction === "asc" ? valA - valB : valB - valA;
      }
      if (sortBy.field === "odds" || sortBy.field === "stake") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }
      return sortBy.direction === "asc" ? valA - valB : valB - valA;
    });

    return result;
  }, [contracts, debouncedSearch, statusFilter, sortBy, eventId, showPastDeadline, showPastDeadlineOption, now]);

  const paginated = filteredContracts.slice((page - 1) * contractsPerPage, page * contractsPerPage);

  const showingFrom = (page - 1) * contractsPerPage + 1;
  const showingTo = Math.min(page * contractsPerPage, filteredContracts.length);

  // Orderbook-specific grouping & stats
const orderbookData = useMemo(() => {
  if (viewMode !== "orderbook") return null;

  const outcomes = [...new Set(filteredContracts.map(c => c.outcome))];
  const groups = outcomes.map(outcome => {
    const outcomeContracts = filteredContracts
      .filter(c => c.outcome === outcome && c.position_type === "sell")
      .sort((a, b) => Number(b.odds || 0) - Number(a.odds || 0)); // highest odds first!

    const totalLiquidity = outcomeContracts.reduce((sum, c) => sum + Number(c.stake || 0), 0);

    return { outcome, contracts: outcomeContracts, totalLiquidity };
  });

  const totalLiquidityAll = groups.reduce((sum, g) => sum + g.totalLiquidity, 0);

  const maxRows = Math.max(...groups.map(g => g.contracts.length), 1);

  // Pre-calculate Avg Odds per row
  const rowAverages = Array(maxRows).fill(null).map((_, rowIndex) => {
    const rowOdds = groups
      .map(g => g.contracts[rowIndex])
      .filter(c => !!c)
      .map(c => Number(c.odds) || 0);

    return rowOdds.length > 0
      ? (rowOdds.reduce((sum, v) => sum + v, 0) / rowOdds.length)
      : null;
  });

  return { groups, totalLiquidityAll, rowAverages, maxRows };
}, [filteredContracts, viewMode]);



  const clearFilters = () => {
    setSearch("");
    setStatusFilter(viewMode === "orderbook" ? ["open"] : []);
    setSortBy(viewMode === "orderbook" ? { field: "odds", direction: "desc" } : { field: "created_at", direction: "desc" });
    setPage(1);
  };

  useEffect(() => {
    onFilterChange?.(filteredContracts);
  }, [filteredContracts, onFilterChange]);

  return (
    <div className="space-y-6">
{showFilters && (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    {/* Header */}
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
      <button
        onClick={clearFilters}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        Clear all
      </button>
    </div>

    <div className="space-y-5">
      {/* First row: Search + Status + Sort */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Search
          </label>
          <input
            type="text"
            placeholder="Title, ID, wallet, multisig..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Status
          </label>
          <div className="flex flex-wrap gap-3">
            {["open", "accepted", "twist", "settled", "cancelled"].map((status) => (
              <label key={status} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilter.includes(status)}
                  onChange={(e) => {
                    setStatusFilter((prev) =>
                      e.target.checked ? [...prev, status] : prev.filter((s) => s !== status)
                    );
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 capitalize">{status}</span>
              </label>
            ))}
          </div>
        </div>

     {/* Sort by – label + direction toggle on same line + select below */}
<div>
  <div className="flex items-center justify-between mb-1.5">
    <label className="block text-sm font-medium text-gray-700">
      Sort by
    </label>

    <div className="flex items-center gap-2">
      {/* Direction toggle */}
      <button
        className="px-3 py-1 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        onClick={() =>
          setSortBy((prev) => ({
            ...prev,
            direction: prev.direction === "asc" ? "desc" : "asc",
          }))
        }
      >
        {sortBy.direction === "asc" ? "↑ Asc" : "↓ Desc"}
      </button>

      {/* Refresh icon if available */}
      {onRefresh && (
        <button
          className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          onClick={onRefresh}
          title="Refresh data"
        >
          ↻
        </button>
      )}
    </div>
  </div>

  <select
    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
    value={sortBy.field}
    onChange={(e) => setSortBy({ field: e.target.value, direction: sortBy.direction })}
  >
    <option value="">None</option>
    <option value="created_at">Created Date</option>
    <option value="acceptanceDeadline">Deadline</option>
    <option value="stake">Stake Amount</option>
    {viewMode === "orderbook" && <option value="odds">Odds</option>}
  </select>
</div>


      </div>

      {/* Deadline checkbox – very close below search */}
      {showPastDeadlineOption && (
        <div className="pt-1">  {/* ← minimal padding, almost touching */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="show-past-deadline"
              checked={showPastDeadline}
              onChange={(e) => {
                setShowPastDeadline(e.target.checked);
                setPage(1);
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Show contracts past acceptance deadline
            </span>
          </label>
        </div>
      )}
    </div>

    {/* Showing info */}
    <div className="mt-6 pt-5 border-t border-gray-100 text-sm text-gray-600">
      Showing <span className="font-medium">{showingFrom}–{showingTo}</span> of{" "}
      <span className="font-medium">{filteredContracts.length}</span> contract
      {filteredContracts.length !== 1 ? "s" : ""}
      {viewMode === "orderbook" && orderbookData && (
        <span className="ml-3 font-medium text-green-700">
          (Total Liquidity: {orderbookData.totalLiquidityAll.toFixed(2)} DASH)
        </span>
      )}
    </div>
  </div>
)}

{renderContent ? (
  renderContent(paginated)
) : viewMode === "orderbook" && orderbookData?.groups?.length > 0 ? (
  <div className="overflow-x-auto mt-6">
    <table className="w-full border-collapse bg-white shadow rounded">
      <thead className="sticky top-0 bg-gray-100 z-10">
        <tr>
          {orderbookData.groups.map(g => (
            <th key={g.outcome} className="border p-3 text-left font-bold">
              {g.outcome}
            </th>
          ))}
          <th className="border p-3 text-left font-bold">Avg Odds</th>
        </tr>
      </thead>
      <tbody>
        {[...Array(orderbookData.maxRows)].map((_, row) => (
          <tr key={row} className="hover:bg-gray-50">
            {orderbookData.groups.map(g => {
              const c = g.contracts[row];
              return (
                <td key={g.outcome} className="border p-3">
                  {c ? (
                    <Link to={`/contract/${c.contract_id}`} className="text-blue-600 hover:underline font-medium">
                      {Number(c.odds).toFixed(2)} ({Number(c.stake).toFixed(2)} DASH)
                    </Link>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              );
            })}
            {/* Avg Odds column – now correct per row */}
            <td className="border p-3 font-medium">
              {orderbookData.rowAverages[row] !== null
                ? orderbookData.rowAverages[row].toFixed(2)
                : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : paginated.length === 0 ? (
  <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow mt-6">
    No contracts match your filters.
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
    {paginated.map(c => (
      <ContractCard key={c.contract_id} contract={c} eventTitle={c.eventTitle} />
    ))}
  </div>
)}

      {/* Pagination */}
      {filteredContracts.length > contractsPerPage && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            className="px-6 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
          >
            Previous
          </button>
          <span className="font-medium">
            Page {page} of {Math.ceil(filteredContracts.length / contractsPerPage)}
          </span>
          <button
            disabled={page * contractsPerPage >= filteredContracts.length}
            onClick={() => setPage(p => p + 1)}
            className="px-6 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterContracts;