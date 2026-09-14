# src/components/UqCouponReport.tsx

- formatUqNumber · function · L4-L4 — formatUqNumber = (value: number | null | undefined, digits = 1)
- couponReportRows · function · L5-L11 — function couponReportRows(dataset: MaterialDataset)
- couponProvenance · function · L12-L14 — couponProvenance = (dataset: MaterialDataset)
- couponWorksheetText · function · L15-L25 — function couponWorksheetText(dataset: MaterialDataset): string
- CouponSummary · function · L27-L35 — function CouponSummary({ stats, unit, synthetic }: { stats: MMPDSEmpiricalAllowableStats; unit: string; synthetic: boolean })
- CouponWorksheet · function · L37-L40 — function CouponWorksheet({ dataset, onCopy, notification }: { dataset: MaterialDataset; onCopy: (value: string, label: string) => void; notification: string | null })
