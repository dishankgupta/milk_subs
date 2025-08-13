// Invoice Number Generation and Management Utilities
// Handles financial year-based invoice numbering system

/**
 * Generate invoice number in format YYYYYYYYNNNNN
 * Example: 20242500001 (Financial Year 2024-25, Sequence 00001)
 */
export function generateInvoiceNumber(sequenceNumber: number): string {
  const currentDate = new Date()
  const financialYear = currentDate.getMonth() >= 3 ? 
    currentDate.getFullYear() : 
    currentDate.getFullYear() - 1
  
  const nextYear = financialYear + 1
  const yearCode = `${financialYear}${nextYear.toString().slice(-2)}`
  const paddedSequence = sequenceNumber.toString().padStart(5, '0')
  
  return `${yearCode}${paddedSequence}`
}

/**
 * Parse invoice number to extract financial year and sequence
 * Returns readable financial year and sequence number
 */
export function parseInvoiceNumber(invoiceNumber: string): {
  financialYear: string
  sequenceNumber: number
} {
  const yearPart = invoiceNumber.slice(0, 6) // 202425
  const sequencePart = invoiceNumber.slice(6) // 00001
  
  return {
    financialYear: `${yearPart.slice(0, 4)}-${yearPart.slice(4)}`,
    sequenceNumber: parseInt(sequencePart, 10)
  }
}

/**
 * Get current financial year
 * Returns the current financial year in YYYY-YY format
 */
export function getCurrentFinancialYear(): string {
  const currentDate = new Date()
  const financialYear = currentDate.getMonth() >= 3 ? 
    currentDate.getFullYear() : 
    currentDate.getFullYear() - 1
  
  const nextYear = (financialYear + 1).toString().slice(-2)
  return `${financialYear}-${nextYear}`
}

/**
 * Check if a date falls within a specific financial year
 */
export function isDateInFinancialYear(date: Date, financialYear: string): boolean {
  const [startYear, endYearShort] = financialYear.split('-')
  const startYearNum = parseInt(startYear, 10)
  const endYearNum = 2000 + parseInt(endYearShort, 10)
  
  const fyStart = new Date(startYearNum, 3, 1) // April 1st
  const fyEnd = new Date(endYearNum, 2, 31) // March 31st
  
  return date >= fyStart && date <= fyEnd
}

/**
 * Get financial year for a specific date
 */
export function getFinancialYearForDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  
  if (month >= 3) {
    // April to December - same financial year
    const nextYear = (year + 1).toString().slice(-2)
    return `${year}-${nextYear}`
  } else {
    // January to March - previous financial year
    const prevYear = year - 1
    const currentYearShort = year.toString().slice(-2)
    return `${prevYear}-${currentYearShort}`
  }
}

/**
 * Generate file path for invoice PDF
 * Creates organized directory structure by financial year and month
 */
export function generateInvoiceFilePath(
  invoiceNumber: string, 
  customerName: string, 
  invoiceDate: Date
): string {
  const financialYear = getFinancialYearForDate(invoiceDate)
  const month = invoiceDate.toLocaleString('en-US', { month: '2-digit' })
  const year = invoiceDate.getFullYear()
  
  // Sanitize customer name for filename
  const sanitizedCustomerName = customerName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  
  return `invoices/${financialYear}/${year}-${month}/${invoiceNumber}_${sanitizedCustomerName}.pdf`
}

/**
 * Validate invoice number format
 * Ensures invoice number follows the correct format
 */
export function validateInvoiceNumber(invoiceNumber: string): boolean {
  // Format: YYYYYYYYNNNNN (11 digits total)
  const pattern = /^\d{6}\d{5}$/
  return pattern.test(invoiceNumber)
}

/**
 * Get next sequence number for current financial year
 * This would typically query the database for the last sequence number
 */
export function getNextSequenceNumber(lastInvoiceNumber?: string): number {
  if (!lastInvoiceNumber) {
    return 1
  }
  
  const { sequenceNumber } = parseInvoiceNumber(lastInvoiceNumber)
  return sequenceNumber + 1
}

/**
 * Format invoice number for display
 * Adds separators for better readability
 */
export function formatInvoiceNumberForDisplay(invoiceNumber: string): string {
  if (!validateInvoiceNumber(invoiceNumber)) {
    return invoiceNumber
  }
  
  const yearPart = invoiceNumber.slice(0, 6)
  const sequencePart = invoiceNumber.slice(6)
  
  return `${yearPart}-${sequencePart}`
}