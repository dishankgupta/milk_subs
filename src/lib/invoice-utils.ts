import { createClient } from "@/lib/supabase/server"
import { getCurrentISTDate, calculateFinancialYear } from "@/lib/date-utils"
import { readFileSync } from "fs"
import path from "path"

export interface InvoiceNumberResult {
  invoiceNumber: string
  financialYear: string
  sequenceNumber: number
}

export async function getNextInvoiceNumber(): Promise<InvoiceNumberResult> {
  const supabase = await createClient()

  // Get current financial year using IST context
  const currentDate = getCurrentISTDate()
  const financialYearInfo = calculateFinancialYear(currentDate)
  
  const financialYearCode = `${financialYearInfo.startYear}${financialYearInfo.endYear.toString().slice(-2)}`
  
  // Get next sequence number from database
  const { data, error } = await supabase.rpc('get_next_invoice_sequence', {
    year_code: financialYearCode
  })

  if (error) {
    throw new Error(`Failed to get next invoice number: ${error.message}`)
  }

  const sequenceNumber = data || 1
  const invoiceNumber = `${financialYearCode}${sequenceNumber.toString().padStart(5, '0')}`

  return {
    invoiceNumber,
    financialYear: `${financialYearInfo.startYear}-${financialYearInfo.endYear}`,
    sequenceNumber
  }
}

/**
 * Parse invoice number to extract financial year and sequence
 * Returns readable financial year and sequence number
 */
export function parseInvoiceNumber(invoiceNumber: string): {
  financialYear: string
  yearCode: string
  sequenceNumber: number
} {
  // Example: "20242500001" -> "2024-25", "202425", 1
  const yearCode = invoiceNumber.slice(0, 6) // "202425"
  const sequenceStr = invoiceNumber.slice(6) // "00001"
  
  const startYear = yearCode.slice(0, 4) // "2024"
  const endYear = "20" + yearCode.slice(4) // "2025"
  
  return {
    financialYear: `${startYear}-${endYear}`,
    yearCode,
    sequenceNumber: parseInt(sequenceStr, 10)
  }
}

export function getCurrentFinancialYear(): {
  startYear: number
  endYear: number
  yearCode: string
  displayYear: string
} {
  const currentDate = getCurrentISTDate()
  const financialYearInfo = calculateFinancialYear(currentDate)
  
  const yearCode = `${financialYearInfo.startYear}${financialYearInfo.endYear.toString().slice(-2)}`
  const displayYear = `${financialYearInfo.startYear}-${financialYearInfo.endYear}`
  
  return {
    startYear: financialYearInfo.startYear,
    endYear: financialYearInfo.endYear,
    yearCode,
    displayYear
  }
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
  const financialYearInfo = calculateFinancialYear(date)
  return `${financialYearInfo.startYear}-${financialYearInfo.endYear}`
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

// ===== NEW INVOICE TEMPLATE UTILITIES =====

/**
 * Convert SVG file to base64 data URI for PDF compatibility
 * Used for footer icons (1www.svg, 2phone.svg, 3email.svg)
 */
export function convertSvgToBase64(svgFileName: string): string {
  try {
    const svgPath = path.join(process.cwd(), 'public', svgFileName)
    const svgContent = readFileSync(svgPath, 'utf-8')
    const base64 = Buffer.from(svgContent).toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  } catch (error) {
    console.error(`Failed to convert SVG ${svgFileName} to base64:`, error)
    return '' // Return empty string on error to avoid breaking template
  }
}

/**
 * Convert PNG file to base64 data URI for embedding in HTML/PDF
 * Used for logo and QR code
 */
export function convertPngToBase64(pngFileName: string): string {
  try {
    const pngPath = path.join(process.cwd(), 'public', pngFileName)
    const pngBuffer = readFileSync(pngPath)
    const base64 = pngBuffer.toString('base64')
    return `data:image/png;base64,${base64}`
  } catch (error) {
    console.error(`Failed to convert PNG ${pngFileName} to base64:`, error)
    return '' // Return empty string on error to avoid breaking template
  }
}

/**
 * Get all converted assets for invoice template
 * Returns base64 data URIs for all required assets
 */
export function getInvoiceAssets(): {
  logo: string
  qrCode: string
  footerIcons: {
    website: string
    phone: string
    email: string
  }
} {
  return {
    logo: convertPngToBase64('PureDairy_Logo-removebg-preview.png'),
    qrCode: convertPngToBase64('QR_code.png'),
    footerIcons: {
      website: convertSvgToBase64('1www.svg'),
      phone: convertSvgToBase64('2phone.svg'),
      email: convertSvgToBase64('3email.svg')
    }
  }
}

/**
 * Calculate responsive font sizes based on content volume
 * Ensures single A4 page constraint with maximum 31 days and 7 products
 */
export function calculateResponsiveFontSizes(contentMetrics: {
  dailySummaryDays: number
  productCount: number
  totalLineItems: number
}): {
  baseSize: number
  headerSize: number
  titleSize: number
  summarySize: number
  scaleFactor: number
} {
  const { dailySummaryDays, productCount, totalLineItems } = contentMetrics

  // Calculate content density score (higher = more content = smaller fonts)
  const contentDensity = Math.min(
    (dailySummaryDays / 31) * 0.4 + 
    (productCount / 7) * 0.3 + 
    (totalLineItems / 15) * 0.3,
    1.0
  )

  // Base font size: 12px normal, scales down to 9px for high-density content
  const baseSize = Math.max(12 - (contentDensity * 3), 9)
  const scaleFactor = baseSize / 12

  return {
    baseSize,
    headerSize: Math.round(baseSize * 1.5), // 18px normal, down to 13.5px
    titleSize: Math.round(baseSize * 2.5),  // 30px normal, down to 22.5px
    summarySize: Math.max(baseSize - 1, 8), // 11px normal, down to 8px minimum
    scaleFactor
  }
}

/**
 * Generate Open Sans font import CSS for PDF generation
 * Loads specified font weights for proper rendering
 */
export function getOpenSansFontCSS(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;800&display=swap');
    
    .font-open-sans-regular {
      font-family: "Open Sans", sans-serif;
      font-optical-sizing: auto;
      font-weight: 400;
      font-style: normal;
      font-variation-settings: "wdth" 100;
    }
    
    .font-open-sans-medium {
      font-family: "Open Sans", sans-serif;
      font-optical-sizing: auto;
      font-weight: 500;
      font-style: normal;
      font-variation-settings: "wdth" 100;
    }
    
    .font-open-sans-extrabold {
      font-family: "Open Sans", sans-serif;
      font-optical-sizing: auto;
      font-weight: 800;
      font-style: normal;
      font-variation-settings: "wdth" 100;
    }
  `
}

/**
 * Format daily summary data for 4-column layout
 * Distributes transaction days dynamically across columns
 */
export function formatDailySummaryForColumns(dailySummary: Array<{
  date: string
  items: Array<{
    productName: string
    quantity: number
    unitOfMeasure: string
  }>
}>): Array<Array<{
  date: string
  formattedDate: string
  items: string[]
}>> {
  // Convert to display format
  const formattedDays = dailySummary.map(day => ({
    date: day.date,
    formattedDate: new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }).format(new Date(day.date)),
    items: day.items.map(item => 
      `${item.productName} - ${item.quantity} ${item.unitOfMeasure}`
    )
  }))

  // Distribute into 4 columns dynamically
  const columns: Array<Array<typeof formattedDays[0]>> = [[], [], [], []]
  const itemsPerColumn = Math.ceil(formattedDays.length / 4)

  formattedDays.forEach((day, index) => {
    const columnIndex = Math.floor(index / itemsPerColumn)
    if (columnIndex < 4) {
      columns[columnIndex].push(day)
    } else {
      // If we have more than expected, add to the last column
      columns[3].push(day)
    }
  })

  return columns
}