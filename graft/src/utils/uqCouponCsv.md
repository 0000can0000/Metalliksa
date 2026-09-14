# src/utils/uqCouponCsv.ts

- Header · type · L12-L12 — type Header = typeof HEADERS[number];
- readRows · function · L19-L60 — function readRows(text: string): string[][]
- pushCell · function · L25-L30 — pushCell = ()
- pushRow · function · L31-L36 — pushRow = ()
- parseCSVToCoupons · function · L63-L130 — function parseCSVToCoupons(csvText: string, datasetId: string): CouponTestSpecimen[]
- get · function · L93-L93 — get = (key: Header)
- getText · function · L94-L97 — getText = (key: Header)
- number · function · L98-L105 — number = (key: Header, required = false): number | null
- csvCell · function · L132-L138 — function csvCell(value: string | number | null | undefined): string
- exportCouponsToCSV · function · L141-L154 — function exportCouponsToCSV(coupons: CouponTestSpecimen[], datasetName: string): string
