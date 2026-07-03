export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fa-IR').format(price)
}

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fa-IR').format(num)
}

export const calculatePriceBreakdown = (
  weight: number,
  goldPrice: number,
  laborPercent: number,
  profitPercent: number,
  taxPercent: number,
  shipping: number = 0
) => {
  const rawGold = weight * goldPrice
  const labor = rawGold * (laborPercent / 100)
  const profit = rawGold * (profitPercent / 100)
  const tax = (rawGold + labor + profit) * (taxPercent / 100)
  const total = rawGold + labor + profit + tax + shipping

  return {
    rawGold,
    labor,
    profit,
    tax,
    shipping,
    total,
  }
}

export const getCategoryName = (category: string): string => {
  const categories: Record<string, string> = {
    ring: 'انگشتر',
    necklace: 'گردنبند',
    bracelet: 'دستبند',
    earring: 'گوشواره',
    pendant: 'آویز',
    custom: 'سفارشی',
  }
  return categories[category] || category
}

export const getStatusText = (status: string): string => {
  const statuses: Record<string, string> = {
    pending: 'در انتظار پرداخت',
    paid: 'پرداخت شده',
    processing: 'در حال پردازش',
    shipped: 'ارسال شده',
    delivered: 'تحویل داده شده',
    cancelled: 'لغو شده',
  }
  return statuses[status] || status
}

export const getPriorityText = (priority: string): string => {
  const priorities: Record<string, string> = {
    low: 'کم',
    medium: 'متوسط',
    high: 'بالا',
    critical: 'بحرانی',
  }
  return priorities[priority] || priority
}

export const getTaskStatusText = (status: string): string => {
  const statuses: Record<string, string> = {
    todo: 'انجام نشده',
    'in-progress': 'در حال انجام',
    review: 'بررسی',
    done: 'انجام شده',
  }
  return statuses[status] || status
}

export const getAuctionStatusText = (status: string): string => {
  const statuses: Record<string, string> = {
    pending_review: 'در انتظار بررسی',
    scheduled: 'زمان‌بندی‌شده',
    active: 'در حال برگزاری',
    extended: 'تمدیدشده',
    ended: 'پایان یافته',
    awaiting_payment: 'در انتظار پرداخت',
    completed: 'تکمیل‌شده',
    cancelled: 'لغو شده',
    failed: 'ناموفق',
  }
  return statuses[status] || status
}

export const getAuctionStatusBadge = (status: string): string => {
  const badges: Record<string, string> = {
    pending_review: 'badge-warning',
    scheduled: 'badge-gold',
    active: 'badge-success',
    extended: 'badge-info',
    ended: 'badge-warning',
    awaiting_payment: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'badge-danger',
    failed: 'badge-danger',
  }
  return badges[status] || 'badge-info'
}

export const getAuctionPaymentText = (status: string): string => {
  const statuses: Record<string, string> = {
    unpaid: 'پرداخت نشده',
    escrow_held: 'در امانت',
    paid: 'پرداخت شده',
    settled: 'تسویه‌شده',
    refunded: 'عودت داده شده',
    failed: 'ناموفق',
  }
  return statuses[status] || status
}

export const getPaymentStatusText = (status: string): string => {
  const statuses: Record<string, string> = {
    initiated: 'شروع‌شده',
    pending: 'در انتظار پرداخت',
    paid: 'پرداخت شده',
    failed: 'ناموفق',
    refunded: 'عودت داده شده',
  }
  return statuses[status] || status
}

export const getPaymentBadge = (status: string): string => {
  const badges: Record<string, string> = {
    initiated: 'badge-info',
    pending: 'badge-warning',
    paid: 'badge-success',
    failed: 'badge-danger',
    refunded: 'badge-danger',
  }
  return badges[status] || 'badge-info'
}

