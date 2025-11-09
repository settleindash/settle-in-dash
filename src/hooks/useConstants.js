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
        const resp = await fetch("https://settleindash.com/api/constants.php");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data.success) throw new Error(data.error || "Invalid config");
        cachedConstants = data;
        setConstants(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConstants();
  }, []);

  return { constants, loading, error };
};