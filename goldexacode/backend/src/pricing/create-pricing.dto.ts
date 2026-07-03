export class CreatePricingRuleDto {
  name: string
  description?: string | null
  laborRate?: number
  profitRate?: number
  taxRate?: number
  isActive?: boolean
}

export class CreatePricingSpreadDto {
  productCategory: string
  spreadPercent: number
  isActive?: boolean
}

export class CreateTaxRuleDto {
  productCategory?: string | null
  taxRate: number
  isActive?: boolean
}

export class CreateLaborCostRuleDto {
  productCategory: string
  baseLabor: number
  perGramLabor: number
  isActive?: boolean
}
