import { promises as fs } from 'fs'
import path from 'path'
import { format } from 'date-fns'

export interface InvoiceFileManager {
  createDateFolder(baseFolder: string, date?: Date): Promise<string>
  sanitizeFilename(filename: string): string
  getInvoiceFileName(invoiceNumber: string, customerName: string): string
  getCombinedFileName(firstInvoice: string, lastInvoice: string): string
  ensureFolderExists(folderPath: string): Promise<void>
}

export const invoiceFileManager: InvoiceFileManager = {
  async createDateFolder(baseFolder: string, date: Date = new Date()): Promise<string> {
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
  
  const browser = await puppeteer.default.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    })
  } finally {
    await browser.close()
  }
}