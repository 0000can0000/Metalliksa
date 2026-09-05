import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { SampleDigitalTwin, DigitalTwinAttachment } from "../types/digitalTwin";
import { DEFAULT_DIGITAL_TWINS } from "../data/digitalTwinStore";
import {
  loadDigitalTwinsFromIDB,
  saveDigitalTwinsToIDB,
  loadActiveTwinIdFromIDB,
  saveActiveTwinIdToIDB,
  getStorageQuotaInfo,
  StorageQuotaInfo,
} from "../services/digitalTwinStorage";

export interface DigitalTwinContextType {
  twins: SampleDigitalTwin[];
  activeTwinId: string;
  activeTwin: SampleDigitalTwin;
  setActiveTwinId: (id: string) => void;
  updateActiveTwin: (updater: Partial<SampleDigitalTwin> | ((prev: SampleDigitalTwin) => SampleDigitalTwin)) => void;
  createNewTwin: (base?: Partial<SampleDigitalTwin>) => SampleDigitalTwin;
  deleteTwin: (id: string) => void;
  exportTwinAsJSON: (twin?: SampleDigitalTwin) => void;
  importTwinFromJSON: (jsonString: string) => boolean;
  syncWithModuleData: (moduleName: string, dataPatch: Partial<SampleDigitalTwin>) => void;
  attachBinaryDataset: (twinId: string, attachment: DigitalTwinAttachment) => Promise<void>;
  removeBinaryDataset: (twinId: string, attachmentId: string) => Promise<void>;
  storageInfo: StorageQuotaInfo | null;
  refreshStorageQuota: () => Promise<void>;
  isStorageLoading: boolean;
}

const DigitalTwinContext = createContext<DigitalTwinContextType | undefined>(undefined);

export const DigitalTwinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [twins, setTwins] = useState<SampleDigitalTwin[]>(DEFAULT_DIGITAL_TWINS);
  const [activeTwinId, setActiveTwinId] = useState<string>(DEFAULT_DIGITAL_TWINS[0].id);
  const [storageInfo, setStorageInfo] = useState<StorageQuotaInfo | null>(null);
  const [isStorageLoading, setIsStorageLoading] = useState<boolean>(true);

  // Track initialization to avoid overwriting IndexedDB with initial state
  const isInitializedRef = useRef<boolean>(false);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initStorage() {
      try {
        setIsStorageLoading(true);
        const [loadedTwins, loadedActiveId, quota] = await Promise.all([
          loadDigitalTwinsFromIDB(),
          loadActiveTwinIdFromIDB(),
          getStorageQuotaInfo(),
        ]);

        if (isMounted) {
          if (loadedTwins && loadedTwins.length > 0) {
            setTwins(loadedTwins);
            if (loadedActiveId && loadedTwins.some((t) => t.id === loadedActiveId)) {
              setActiveTwinId(loadedActiveId);
            } else {
              setActiveTwinId(loadedTwins[0].id);
            }
          }
          setStorageInfo(quota);
          isInitializedRef.current = true;
          setIsStorageLoading(false);
        }
      } catch (err) {
        console.error("[DigitalTwinContext] Error initializing IndexedDB storage:", err);
        if (isMounted) {
          isInitializedRef.current = true;
          setIsStorageLoading(false);
        }
      }
    }

    initStorage();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist to IndexedDB whenever twins or activeTwinId changes (once initialized)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const timeoutId = setTimeout(async () => {
      try {
        await Promise.all([
          saveDigitalTwinsToIDB(twins),
          saveActiveTwinIdToIDB(activeTwinId),
        ]);
        const quota = await getStorageQuotaInfo();
        setStorageInfo(quota);
      } catch (err) {
        console.error("[DigitalTwinContext] Error auto-persisting to IndexedDB:", err);
      }
    }, 150); // small debounce to bundle rapid keystrokes/updates

    return () => clearTimeout(timeoutId);
  }, [twins, activeTwinId]);

  const refreshStorageQuota = useCallback(async () => {
    try {
      const quota = await getStorageQuotaInfo();
      setStorageInfo(quota);
    } catch {
      // ignore
    }
  }, []);

  const activeTwin = twins.find((t) => t.id === activeTwinId) || twins[0] || DEFAULT_DIGITAL_TWINS[0];

  const updateActiveTwin = useCallback(
    (updater: Partial<SampleDigitalTwin> | ((prev: SampleDigitalTwin) => SampleDigitalTwin)) => {
      setTwins((prevTwins) =>
        prevTwins.map((t) => {
          if (t.id === activeTwinId) {
            const updated = typeof updater === "function" ? updater(t) : { ...t, ...updater };
            return {
              ...updated,
              lastUpdated: new Date().toISOString().split("T")[0],
            };
          }
          return t;
        })
      );
    },
    [activeTwinId]
  );

  const syncWithModuleData = useCallback(
    (_moduleName: string, dataPatch: Partial<SampleDigitalTwin>) => {
      updateActiveTwin((prev) => ({
        ...prev,
        ...dataPatch,
        lastUpdated: new Date().toISOString().split("T")[0],
      }));
    },
    [updateActiveTwin]
  );

  const createNewTwin = useCallback(
    (base?: Partial<SampleDigitalTwin>): SampleDigitalTwin => {
      const newId = `twin-${Date.now()}`;
      const newSerial = `TWIN-CUSTOM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const newTwin: SampleDigitalTwin = {
        ...DEFAULT_DIGITAL_TWINS[0],
        id: newId,
        serialNumber: newSerial,
        sampleName: base?.sampleName || "Custom Metallurgical Specimen Twin",
        creationDate: new Date().toISOString().split("T")[0],
        lastUpdated: new Date().toISOString().split("T")[0],
        attachments: [],
        ...base,
      };

      setTwins((prev) => [newTwin, ...prev]);
      setActiveTwinId(newId);
      return newTwin;
    },
    []
  );

  const deleteTwin = useCallback((id: string) => {
    setTwins((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        return DEFAULT_DIGITAL_TWINS;
      }
      return filtered;
    });
    setActiveTwinId((prevActive) => {
      if (prevActive === id) {
        const remaining = twins.filter((t) => t.id !== id);
        return remaining[0]?.id || DEFAULT_DIGITAL_TWINS[0].id;
      }
      return prevActive;
    });
  }, [twins]);

  const attachBinaryDataset = useCallback(
    async (twinId: string, attachment: DigitalTwinAttachment) => {
      setTwins((prev) =>
        prev.map((twin) => {
          if (twin.id === twinId) {
            const existing = twin.attachments || [];
            return {
              ...twin,
              attachments: [attachment, ...existing.filter((a) => a.id !== attachment.id)],
              lastUpdated: new Date().toISOString().split("T")[0],
            };
          }
          return twin;
        })
      );
    },
    []
  );

  const removeBinaryDataset = useCallback(
    async (twinId: string, attachmentId: string) => {
      setTwins((prev) =>
        prev.map((twin) => {
          if (twin.id === twinId) {
            return {
              ...twin,
              attachments: (twin.attachments || []).filter((a) => a.id !== attachmentId),
              lastUpdated: new Date().toISOString().split("T")[0],
            };
          }
          return twin;
        })
      );
    },
    []
  );

  const exportTwinAsJSON = useCallback(
    (twinToExport?: SampleDigitalTwin) => {
      const target = twinToExport || activeTwin;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(target, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${target.serialNumber}_DIGITAL_TWIN.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    },
    [activeTwin]
  );

  const importTwinFromJSON = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.id && parsed.sampleName && parsed.chemistry) {
        const uniqueId = `twin-imported-${Date.now()}`;
        const imported: SampleDigitalTwin = {
          ...parsed,
          id: uniqueId,
          lastUpdated: new Date().toISOString().split("T")[0],
        };
        setTwins((prev) => [imported, ...prev]);
        setActiveTwinId(uniqueId);
        return true;
      }
    } catch (e) {
      console.error("[DigitalTwinContext] Error importing digital twin JSON:", e);
    }
    return false;
  }, []);

  return (
    <DigitalTwinContext.Provider
      value={{
        twins,
        activeTwinId,
        activeTwin,
        setActiveTwinId,
        updateActiveTwin,
        createNewTwin,
        deleteTwin,
        exportTwinAsJSON,
        importTwinFromJSON,
        syncWithModuleData,
        attachBinaryDataset,
        removeBinaryDataset,
        storageInfo,
        refreshStorageQuota,
        isStorageLoading,
      }}
    >
      {children}
    </DigitalTwinContext.Provider>
  );
};

export const useDigitalTwin = (): DigitalTwinContextType => {
  const context = useContext(DigitalTwinContext);
  if (!context) {
    throw new Error("useDigitalTwin must be used within a DigitalTwinProvider");
  }
  return context;
};
