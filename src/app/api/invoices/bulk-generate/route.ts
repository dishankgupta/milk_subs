import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prepareInvoiceData, saveInvoiceMetadata, generateInvoiceHTML } from "@/lib/actions/invoices"
import { invoiceFileManager, generatePdfFromHtml, combinePdfs } from "@/lib/file-utils"
import path from "path"

interface BulkGenerationParams {
  period_start: string
  period_end: string
  customer_ids: string[]
  output_folder: string
}

interface ProgressUpdate {
  type: 'progress' | 'error' | 'complete'
  completed: number
  total: number
  currentCustomer?: string
  error?: string
  successful?: number
  combinedPdfPath?: string
  invoiceNumbers?: string[]
}

export async function POST(request: NextRequest) {
  const params: BulkGenerationParams = await request.json()
  const { output_folder, customer_ids, period_start, period_end } = params

  // Set up Server-Sent Events
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial progress
        const initialProgress: ProgressUpdate = {
          type: 'progress',
          completed: 0,
          total: customer_ids.length,
          currentCustomer: ''
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialProgress)}\n\n`))

        // Create dated subfolder
        const dateFolder = await invoiceFileManager.createDateFolder(output_folder)
        
        const results = {
          successful: 0,
          errors: [] as string[],
          invoiceNumbers: [] as string[],
          combinedPdfPath: ""
        }

        const individualPdfPaths: string[] = []

        // Process each customer
        for (let i = 0; i < customer_ids.length; i++) {
          const customerId = customer_ids[i]
          
          try {
            // Get customer name for progress
            const supabase = await createClient()
            const { data: customer } = await supabase
              .from("customers")
              .select("billing_name")
              .eq("id", customerId)
              .single()

            const currentCustomer = customer?.billing_name || `Customer ${i + 1}`

            // Send progress update
            const progressUpdate: ProgressUpdate = {
              type: 'progress',
              completed: i,
              total: customer_ids.length,
              currentCustomer
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressUpdate)}\n\n`))

            // Prepare invoice data
            const invoiceData = await prepareInvoiceData(customerId, period_start, period_end)
            
            // Generate PDF file name
            const sanitizedCustomerName = invoiceFileManager.sanitizeFilename(
              invoiceData.customer.billing_name
            )
            const pdfFileName = invoiceFileManager.getInvoiceFileName(
              invoiceData.invoiceNumber, 
              sanitizedCustomerName
            )
            const pdfFilePath = path.join(dateFolder, pdfFileName)

            // Generate HTML content and create PDF with retry logic
            const html = await generateInvoiceHTML(invoiceData)
            
            // Retry PDF generation up to 3 times for transient failures
            let pdfAttempts = 0
            const maxPdfAttempts = 3
            
            while (pdfAttempts < maxPdfAttempts) {
              try {
                await generatePdfFromHtml(html, pdfFilePath)
                break // Success, exit retry loop
              } catch (pdfError) {
                pdfAttempts++
                console.log(`PDF generation attempt ${pdfAttempts} failed for ${invoiceData.customer.billing_name}:`, pdfError)
                
                if (pdfAttempts >= maxPdfAttempts) {
                  throw pdfError // Final attempt failed, throw the error
                }
                
                // Wait before retrying (exponential backoff: 1s, 2s, 4s)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, pdfAttempts - 1)))
              }
            }

            // Save invoice metadata
            await saveInvoiceMetadata(invoiceData, pdfFilePath)

            // Track success
            results.successful++
            results.invoiceNumbers.push(invoiceData.invoiceNumber)
            individualPdfPaths.push(pdfFilePath)

          } catch (error) {
            const errorMsg = `Customer ${customer_ids[i]}: ${error instanceof Error ? error.message : 'Unknown error'}`
            results.errors.push(errorMsg)

            // Send error update
            const errorUpdate: ProgressUpdate = {
              type: 'error',
              completed: i + 1,
              total: customer_ids.length,
              error: errorMsg
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`))
          }
        }

        // Generate combined PDF
        if (individualPdfPaths.length > 0) {
          const combinedFileName = invoiceFileManager.getCombinedFileName(
            results.invoiceNumbers[0],
            results.invoiceNumbers[results.invoiceNumbers.length - 1]
          )
          const combinedPdfPath = path.join(dateFolder, combinedFileName)
          
          await combinePdfs(individualPdfPaths, combinedPdfPath)
          results.combinedPdfPath = combinedPdfPath
        }

        // Send completion update
        const completeUpdate: ProgressUpdate = {
          type: 'complete',
          completed: customer_ids.length,
          total: customer_ids.length,
          successful: results.successful,
          combinedPdfPath: results.combinedPdfPath,
          invoiceNumbers: results.invoiceNumbers
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeUpdate)}\n\n`))

      } catch (error) {
        const errorUpdate: ProgressUpdate = {
          type: 'error',
          completed: customer_ids.length,
          total: customer_ids.length,
          error: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}