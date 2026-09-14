# src/components/uqLabData.ts

- CouponTestSpecimen · interface · L6-L19 — interface CouponTestSpecimen
- MaterialDataset · interface · L21-L47 — interface MaterialDataset
- MMPDSEmpiricalAllowableStats · interface · L49-L86 — interface MMPDSEmpiricalAllowableStats
- calculateMMPDSToleranceFactor · function · L96-L110 — function calculateMMPDSToleranceFactor(n: number, p: number = 0.99, gamma: number = 0.95): number | null
- finiteOrNull · function · L112-L114 — function finiteOrNull(value: number): number | null
- empiricalHistogram · function · L116-L147 — function empiricalHistogram(values: number[], min: number, max: number): MMPDSEmpiricalAllowableStats["histogram"]
- computeMMPDSEmpiricalStats · function · L155-L257 — function computeMMPDSEmpiricalStats( values: (number | null)[], specMin: number, lotIds: string[] = [] ): MMPDSEmpiricalAllowableStats
- generateSyntheticCoupons · function · L262-L328 — function generateSyntheticCoupons(params: { datasetId: string; sampleSize: number; lotCount: number; meanYield: number; stdYield: number; meanUTS: number; stdUTS: number; meanElongation: number; stdElongation: number; testStandard?: string; }): CouponTestSpecimen[]
- isSyntheticCouponDataset · function · L330-L332 — function isSyntheticCouponDataset(dataset: MaterialDataset): boolean
