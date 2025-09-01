/**
 * Test script for PDF generation
 * This script can be used to test if Puppeteer and Chrome are working correctly
 * 
 * Run with: node scripts/test-pdf.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPdfGeneration() {
  console.log('🔧 Testing PDF generation with Puppeteer...');
  
  let browser;
  
  try {
    console.log('📂 Launching Chrome browser...');
    browser = await puppeteer.launch({ 
      headless: true,
      timeout: 60000,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    console.log('✅ Chrome launched successfully');

    const page = await browser.newPage();
    
    // Simple HTML content for testing
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PDF Test</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2D5F2D; }
          </style>
        </head>
        <body>
          <h1>PDF Generation Test</h1>
          <p>This is a test PDF generated on ${new Date().toLocaleDateString()}</p>
          <p>If you can see this, PDF generation is working correctly!</p>
        </body>
      </html>
    `;

    console.log('📄 Setting page content...');
    await page.setContent(testHtml, { waitUntil: 'domcontentloaded' });

    const outputPath = path.join(__dirname, '..', 'test-output.pdf');
    
    console.log('📥 Generating PDF...');
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true
    });

    console.log(`✅ PDF generated successfully: ${outputPath}`);
    console.log('🎉 PDF generation test completed successfully!');
    
    return true;

  } catch (error) {
    console.error('❌ PDF generation test failed:', error.message);
    
    if (error.message.includes('Chrome')) {
      console.log('\n💡 Chrome installation issue detected!');
      console.log('   Try running: npx puppeteer browsers install chrome');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Timeout issue detected!');
      console.log('   The PDF generation is taking too long. Check system resources.');
    }
    
    return false;
    
  } finally {
    if (browser) {
      console.log('🧹 Closing browser...');
      await browser.close();
    }
  }
}

// Run the test
testPdfGeneration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });