import { promises as fs } from 'fs'
import path from 'path'
import { format } from 'date-fns'
import { getCurrentISTDate, formatDateForDatabase } from '@/lib/date-utils'

export interface InvoiceFileManager {
  createDateFolder(baseFolder: string, date?: Date): Promise<string>
  sanitizeFilename(filename: string): string
  getInvoiceFileName(invoiceNumber: string, customerName: string): string
  getCombinedFileName(firstInvoice: string, lastInvoice: string): string
  ensureFolderExists(folderPath: string): Promise<void>
}

export const invoiceFileManager: InvoiceFileManager = {
  async createDateFolder(baseFolder: string, date: Date = getCurrentISTDate()): Promise<string> {
    const dateFolder = format(date, 'yyyyMMdd') + '_generated_invoices'
    const fullPath = path.join(baseFolder, dateFolder)
    
    await this.ensureFolderExists(fullPath)
    return fullPath
  },

  sanitizeFilename(filename: string): string {
    // Remove invalid characters and limit length
    return filename
      .replace(/[<>:"/\\|?*]/g, '')  // Remove invalid characters
      .replace(/\s+/g, '')           // Remove spaces
      .slice(0, 50)                  // Limit length
  },

  getInvoiceFileName(invoiceNumber: string, customerName: string): string {
    const sanitizedName = this.sanitizeFilename(customerName)
    return `${invoiceNumber}-${sanitizedName}.pdf`
  },

  getCombinedFileName(firstInvoice: string, lastInvoice: string): string {
    return `${firstInvoice}-${lastInvoice}-BulkInvoices.pdf`
  },

  async ensureFolderExists(folderPath: string): Promise<void> {
    try {
      await fs.access(folderPath)
    } catch {
      await fs.mkdir(folderPath, { recursive: true })
    }
  }
}

// Invoice file path tracking
export interface InvoiceFilePaths {
  individual: string[]
  combined: string
  folder: string
}

export async function organizeInvoiceFiles(
  baseFolder: string,
  invoiceData: { invoiceNumber: string; customerName: string }[]
): Promise<InvoiceFilePaths> {
  const dateFolder = await invoiceFileManager.createDateFolder(baseFolder)
  
  const individualPaths = invoiceData.map(data => 
    path.join(dateFolder, invoiceFileManager.getInvoiceFileName(
      data.invoiceNumber, 
      data.customerName
    ))
  )

  const combinedPath = invoiceData.length > 1 
    ? path.join(dateFolder, invoiceFileManager.getCombinedFileName(
        invoiceData[0].invoiceNumber,
        invoiceData[invoiceData.length - 1].invoiceNumber
      ))
    : ""

  return {
    individual: individualPaths,
    combined: combinedPath,
    folder: dateFolder
  }
}

export async function combinePdfs(inputPaths: string[], outputPath: string): Promise<void> {
  // This would typically use pdf-lib to combine PDFs
  // For now, implementing a basic version
  const { PDFDocument } = await import('pdf-lib')
  
  const mergedPdf = await PDFDocument.create()

  for (const inputPath of inputPaths) {
    try {
      const pdfBytes = await fs.readFile(inputPath)
      const pdf = await PDFDocument.load(pdfBytes)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    } catch (error) {
      console.error(`Failed to merge PDF: ${inputPath}`, error)
    }
  }

  const pdfBytes = await mergedPdf.save()
  await fs.writeFile(outputPath, pdfBytes)
}

export async function generatePdfFromHtml(html: string, outputPath: string): Promise<void> {
  const puppeteer = await import('puppeteer')
  
  // Ensure the output directory exists
  const outputDir = path.dirname(outputPath)
  await invoiceFileManager.ensureFolderExists(outputDir)
  
  let browser
  let page
  
  try {
    // Launch browser with extended timeout and better stability options
    browser = await puppeteer.default.launch({ 
      headless: true,
      timeout: 60000, // 60 second timeout for browser launch
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'
      ]
    })

    // Create page with timeout protection
    page = await browser.newPage()
    
    // Set longer timeouts for page operations
    page.setDefaultTimeout(60000)
    page.setDefaultNavigationTimeout(60000)
    
    // Set viewport
    await page.setViewport({ width: 1200, height: 1600 })
    
    // Set content with more lenient wait conditions
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded', // Less strict than networkidle0
      timeout: 45000 
    })
    
    // Add a small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Generate PDF with timeout protection
    await Promise.race([
      page.pdf({
        path: outputPath,
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true,
        preferCSSPageSize: false,
        timeout: 30000 // 30 second timeout for PDF generation
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF generation timeout')), 45000)
      )
    ])
    
  } catch (error) {
    console.error('PDF generation error:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Target closed')) {
        throw new Error('Browser closed unexpectedly during PDF generation. Please try again.')
      } else if (error.message.includes('timeout')) {
        throw new Error('PDF generation timed out. The invoice may be too complex.')
      } else if (error.message.includes('Protocol error')) {
        throw new Error('Browser protocol error. Please check system resources and try again.')
      }
    }
    
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    // Ensure cleanup happens in the right order
    try {
      if (page && !page.isClosed()) {
        await page.close()
      }
    } catch (e) {
      console.warn('Error closing page:', e)
    }
    
    try {
      if (browser && browser.process()) {
        await browser.close()
      }
    } catch (e) {
      console.warn('Error closing browser:', e)
    }
  }
}