# src/services/digitalTwinStorage.ts

- StorageQuotaInfo · interface · L10-L16 — interface StorageQuotaInfo
- isIndexedDBAvailable · function · L21-L27 — function isIndexedDBAvailable(): boolean
- migrateFromLocalStorageIfNeeded · function · L33-L59 — async function migrateFromLocalStorageIfNeeded(): Promise<SampleDigitalTwin[] | null>
- loadDigitalTwinsFromIDB · function · L65-L97 — async function loadDigitalTwinsFromIDB(): Promise<SampleDigitalTwin[]>
- saveDigitalTwinsToIDB · function · L103-L119 — async function saveDigitalTwinsToIDB(twins: SampleDigitalTwin[]): Promise<void>
- loadActiveTwinIdFromIDB · function · L124-L144 — async function loadActiveTwinIdFromIDB(): Promise<string | null>
- saveActiveTwinIdToIDB · function · L149-L164 — async function saveActiveTwinIdToIDB(id: string): Promise<void>
- getStorageQuotaInfo · function · L169-L196 — async function getStorageQuotaInfo(): Promise<StorageQuotaInfo>
