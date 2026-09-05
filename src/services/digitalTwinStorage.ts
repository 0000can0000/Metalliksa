import { get, set, del } from "idb-keyval";
import { SampleDigitalTwin, DigitalTwinAttachment } from "../types/digitalTwin";
import { DEFAULT_DIGITAL_TWINS } from "../data/digitalTwinStore";

export const IDB_TWINS_KEY = "metallix_digital_twins_idb";
export const IDB_ACTIVE_TWIN_ID_KEY = "metallix_active_twin_id_idb";
const LEGACY_STORAGE_TWINS_KEY = "metallix_digital_twins";
const LEGACY_STORAGE_ACTIVE_ID_KEY = "metallix_active_twin_id";

export interface StorageQuotaInfo {
  usageMb: number;
  quotaMb: number;
  usagePercent: number;
  engine: "IndexedDB (idb-keyval)" | "localStorage (fallback)";
  isUnlimitedOrLarge: boolean;
}

/**
 * Checks if IndexedDB is available in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== "undefined" && "indexedDB" in window && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Migrates existing digital twin records from legacy localStorage to IndexedDB.
 * Removes large payloads from localStorage after successful migration to prevent QuotaExceededError.
 */
async function migrateFromLocalStorageIfNeeded(): Promise<SampleDigitalTwin[] | null> {
  if (typeof window === "undefined") return null;

  try {
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_TWINS_KEY);
    if (!rawLegacy) return null;

    const parsed = JSON.parse(rawLegacy);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.info(`[DigitalTwinStorage] Migrating ${parsed.length} digital twin(s) from localStorage (5 MB limit) to IndexedDB...`);
      await set(IDB_TWINS_KEY, parsed);

      const legacyActiveId = localStorage.getItem(LEGACY_STORAGE_ACTIVE_ID_KEY);
      if (legacyActiveId) {
        await set(IDB_ACTIVE_TWIN_ID_KEY, legacyActiveId);
      }

      // Clean up legacy localStorage to free the tight 5MB limit
      localStorage.removeItem(LEGACY_STORAGE_TWINS_KEY);
      console.info("[DigitalTwinStorage] Migration to IndexedDB complete. Freed localStorage quota.");
      return parsed;
    }
  } catch (err) {
    console.warn("[DigitalTwinStorage] Error migrating legacy localStorage data:", err);
  }
  return null;
}

/**
 * Loads digital twins asynchronously from IndexedDB.
 * Falls back to legacy migration or DEFAULT_DIGITAL_TWINS.
 */
export async function loadDigitalTwinsFromIDB(): Promise<SampleDigitalTwin[]> {
  if (!isIndexedDBAvailable()) {
    // Fallback if IndexedDB unavailable
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_TWINS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return DEFAULT_DIGITAL_TWINS;
  }

  try {
    // Check IndexedDB
    const storedTwins = await get<SampleDigitalTwin[]>(IDB_TWINS_KEY);
    if (Array.isArray(storedTwins) && storedTwins.length > 0) {
      return storedTwins;
    }

    // Check for legacy localStorage data to migrate
    const migrated = await migrateFromLocalStorageIfNeeded();
    if (migrated && migrated.length > 0) {
      return migrated;
    }

    // Initialize with default digital twins
    await set(IDB_TWINS_KEY, DEFAULT_DIGITAL_TWINS);
    return DEFAULT_DIGITAL_TWINS;
  } catch (err) {
    console.error("[DigitalTwinStorage] Failed to read from IndexedDB:", err);
    return DEFAULT_DIGITAL_TWINS;
  }
}

/**
 * Persists digital twins into IndexedDB asynchronously without blocking the UI.
 * Handles objects of hundreds of megabytes including binary attachments (STL meshes, EBSD maps, raw EIS data).
 */
export async function saveDigitalTwinsToIDB(twins: SampleDigitalTwin[]): Promise<void> {
  if (!isIndexedDBAvailable()) {
    try {
      localStorage.setItem(LEGACY_STORAGE_TWINS_KEY, JSON.stringify(twins));
    } catch (e) {
      console.warn("[DigitalTwinStorage] localStorage quota exceeded in fallback mode:", e);
    }
    return;
  }

  try {
    await set(IDB_TWINS_KEY, twins);
  } catch (err) {
    console.error("[DigitalTwinStorage] Critical error saving to IndexedDB:", err);
    throw err;
  }
}

/**
 * Loads active twin ID from IndexedDB
 */
export async function loadActiveTwinIdFromIDB(): Promise<string | null> {
  if (!isIndexedDBAvailable()) {
    try {
      return localStorage.getItem(LEGACY_STORAGE_ACTIVE_ID_KEY);
    } catch {
      return null;
    }
  }

  try {
    const id = await get<string>(IDB_ACTIVE_TWIN_ID_KEY);
    if (id) return id;
    try {
      return localStorage.getItem(LEGACY_STORAGE_ACTIVE_ID_KEY);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Saves active twin ID to IndexedDB
 */
export async function saveActiveTwinIdToIDB(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    try {
      localStorage.setItem(LEGACY_STORAGE_ACTIVE_ID_KEY, id);
    } catch {
      // ignore
    }
    return;
  }

  try {
    await set(IDB_ACTIVE_TWIN_ID_KEY, id);
  } catch (err) {
    console.warn("[DigitalTwinStorage] Error saving active twin ID to IndexedDB:", err);
  }
}

/**
 * Queries the browser's StorageManager API for estimated storage quota & usage in MB
 */
export async function getStorageQuotaInfo(): Promise<StorageQuotaInfo> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageMb = (estimate.usage || 0) / (1024 * 1024);
      const quotaMb = (estimate.quota || 0) / (1024 * 1024);
      const usagePercent = quotaMb > 0 ? (usageMb / quotaMb) * 100 : 0;

      return {
        usageMb: parseFloat(usageMb.toFixed(2)),
        quotaMb: parseFloat(quotaMb.toFixed(1)),
        usagePercent: parseFloat(usagePercent.toFixed(2)),
        engine: "IndexedDB (idb-keyval)",
        isUnlimitedOrLarge: quotaMb > 50, // Hundreds of MBs/GBs vs 5MB
      };
    } catch {
      // ignore
    }
  }

  return {
    usageMb: 0.5,
    quotaMb: 5.0,
    usagePercent: 10.0,
    engine: isIndexedDBAvailable() ? "IndexedDB (idb-keyval)" : "localStorage (fallback)",
    isUnlimitedOrLarge: isIndexedDBAvailable(),
  };
}
