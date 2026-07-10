import React, { useState, useEffect, useRef, Dispatch, SetStateAction, useCallback } from "react";
import { Transaction } from "../types/real-estate";
import {
  cleanTransactionAddress,
  isPlausibleCoordinateForCity,
} from "../lib/mapLocation";

interface UseGeocodingProps {
  cityName: string;
  filteredData: Transaction[];
  data: Transaction[];
  setData: Dispatch<SetStateAction<Transaction[]>>;
  selectedItem: Transaction | null;
  setSelectedItem: Dispatch<SetStateAction<Transaction | null>>;
  search: string;
  district: string;
}

export const useGeocoding = ({
  cityName,
  filteredData,
  data,
  setData,
  selectedItem,
  setSelectedItem,
  search,
  district,
}: UseGeocodingProps) => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const [totalToGeocode, setTotalToGeocode] = useState(0);

  const locationCache = useRef<Record<string, { lat: number; lng: number }>>({});

  // Load cache
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem("real_estate_loc_cache_v2");
      if (savedCache) {
        locationCache.current = JSON.parse(savedCache);
      }
    } catch (e) {
      console.warn("Could not read geocoding cache from localStorage:", e);
    }
  }, []);

  // Save cache helper
  const saveCache = useCallback(() => {
    try {
      localStorage.setItem("real_estate_loc_cache_v2", JSON.stringify(locationCache.current));
    } catch (e) {
      console.warn("Could not write geocoding cache to localStorage:", e);
    }
  }, []);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchGeocode = async (query: string, city: string) => {
    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        q: query,
        limit: "1",
        countrycodes: "tw",
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: { "Accept-Language": "zh-TW", "User-Agent": "TaiwanRealEstate/1.0" },
        }
      );
      if (!response.ok) return null;
      const results = await response.json();
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        if (isPlausibleCoordinateForCity(lat, lng, city)) return { lat, lng };
      }
    } catch (e) {
      console.warn(`Geocoding fetch failed for ${query}:`, e);
    }
    return null;
  };

  const getCoordinatesWithFallback = async (
    city: string,
    dist: string,
    address: string,
    activeCheck: () => boolean
  ): Promise<{ lat: number; lng: number }> => {
    const cleanedAddress = cleanTransactionAddress(address);
    const fullKey = `FULL:${city}${dist}${cleanedAddress}`;

    // Check full address cache
    if (locationCache.current[fullKey]) return locationCache.current[fullKey];

    if (!activeCheck()) return { lat: 0, lng: 0 };

    // 1. Try Full Address
    let query = `${city}${dist}${cleanedAddress}`;
    let coords = await fetchGeocode(query, city);
    if (coords) {
      locationCache.current[fullKey] = coords;
      saveCache();
      return coords;
    }

    if (!activeCheck()) return { lat: 0, lng: 0 };
    await delay(1200); // Rate limit

    // 2. Try Road Name
    const roadName = cleanedAddress.split(/[0-9]/)[0];
    if (roadName && roadName.length > 2) {
      const roadKey = `ROAD:${city}${dist}${roadName}`;
      if (locationCache.current[roadKey]) {
        locationCache.current[fullKey] = locationCache.current[roadKey];
        saveCache();
        return locationCache.current[roadKey];
      }

      query = `${city}${dist}${roadName}`;
      coords = await fetchGeocode(query, city);
      if (coords) {
        locationCache.current[roadKey] = coords;
        locationCache.current[fullKey] = coords;
        saveCache();
        return coords;
      }

      if (!activeCheck()) return { lat: 0, lng: 0 };
      await delay(1200); // Rate limit
    }

    // Do not use a district centroid as a transaction marker. A missing point
    // is more honest than placing many addresses on the same false location.
    const notFoundCoords = { lat: 0, lng: 0 };
    locationCache.current[fullKey] = notFoundCoords;
    saveCache();
    return notFoundCoords;
  };

  // Batch geocoding for filteredData on map view or general list changes
  useEffect(() => {
    if (filteredData.length === 0) return;

    const maxToGeocode = 40;
    const itemsToProcess = filteredData.slice(0, maxToGeocode);

    // Check if we already have precision for these items
    const needsGeocoding = itemsToProcess.filter((item) => {
      const cleanedAddress = cleanTransactionAddress(item.address);
      const fullKey = `FULL:${cityName}${item.district}${cleanedAddress}`;
      return !locationCache.current[fullKey];
    });

    if (needsGeocoding.length === 0) {
      setGeocodedCount(itemsToProcess.length);
      setTotalToGeocode(itemsToProcess.length);
      setIsGeocoding(false);
      return;
    }

    let active = true;

    const geocodeBatch = async () => {
      if (!active) return;
      setGeocodedCount(0);
      setTotalToGeocode(itemsToProcess.length);
      setIsGeocoding(true);

      // Update data with cache immediately
      let newlyFoundFromCache = false;
      const updatedDataFromCache = (prev: Transaction[]) => {
        let updated = [...prev];
        itemsToProcess.forEach((item) => {
          const cleanedAddress = cleanTransactionAddress(item.address);
          const fullKey = `FULL:${cityName}${item.district}${cleanedAddress}`;
          const cached = locationCache.current[fullKey];
          
          if (cached) {
            const { lat, lng } = cached;
            const idx = updated.findIndex((p) => p.id === item.id);
            if (
              idx !== -1 &&
              (updated[idx].lat !== lat || updated[idx].lng !== lng)
            ) {
              updated[idx] = { ...updated[idx], lat, lng };
              newlyFoundFromCache = true;
            }
          }
        });
        return updated;
      };

      if (newlyFoundFromCache && active) {
        setData(updatedDataFromCache);
      }

      // Progress count should start from cached items
      const cachedCount = itemsToProcess.length - needsGeocoding.length;
      if (active) setGeocodedCount(cachedCount);

      for (let i = 0; i < needsGeocoding.length; i++) {
        if (!active) break;
        const item = needsGeocoding[i];
        
        const coords = await getCoordinatesWithFallback(
          cityName,
          item.district,
          item.address,
          () => active
        );

        if (active && coords.lat !== 0 && coords.lng !== 0) {
          setData((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, lat: coords.lat, lng: coords.lng } : p))
          );
        }
        
        if (active) setGeocodedCount((prev) => prev + 1);
        
        // Wait between items to respect API rate limits
        if (i < needsGeocoding.length - 1 && active) {
          await delay(1200);
        }
      }
      if (active) setIsGeocoding(false);
    };

    geocodeBatch();
    return () => {
      active = false;
    };
  }, [filteredData.length, cityName, search, district]);

  // Priority geocoding for single selectedItem
  useEffect(() => {
    if (!selectedItem || (selectedItem.lat !== undefined && selectedItem.lng !== undefined)) return;

    let active = true;

    const geocodeSingle = async () => {
      const coords = await getCoordinatesWithFallback(
        cityName,
        selectedItem.district,
        selectedItem.address,
        () => active
      );

      if (active) {
        setData((prev) =>
          prev.map((p) => (p.id === selectedItem.id ? { ...p, lat: coords.lat, lng: coords.lng } : p))
        );
        setSelectedItem((prev) =>
          prev && prev.id === selectedItem.id ? { ...prev, lat: coords.lat, lng: coords.lng } : prev
        );
      }
    };

    geocodeSingle();

    return () => {
      active = false;
    };
  }, [selectedItem?.id, cityName]);

  return {
    isGeocoding,
    geocodedCount,
    totalToGeocode,
  };
};
