import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', error => console.error('BROWSER_ERROR:', error.message));
    
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    await browser.close();
  } catch (err) {
    console.error('PUPPETEER_ERROR:', err);
  }
})();
