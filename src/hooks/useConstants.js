// src/hooks/useConstants.js
import { useState, useEffect } from "react";

let cachedConstants = null;

export const useConstants = () => {
  const [constants, setConstants] = useState(cachedConstants || null);
  const [loading, setLoading] = useState(!cachedConstants);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cachedConstants) {
      setConstants(cachedConstants);
      setLoading(false);
      return;
    }

    const fetchConstants = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use your CLEAN proxy — no API key in frontend
        const resp = await fetch("https://settleindash.com/api/constants.php");

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();

        if (!data.success) throw new Error(data.error || "Failed to load constants");

        // Cache the clean response exactly as your proxy returns
        cachedConstants = data;
        setConstants(data);
      } catch (err) {
        console.error("useConstants error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConstants();
  }, []);

  return { constants, loading, error };
};