import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`PAGE LOG: ${msg.text()}`);
        }
    });

    page.on('pageerror', err => {
        console.log(`PAGE ERROR: ${err.message}`);
    });

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
        console.log("Page loaded successfully.");
    } catch (e) {
        console.log("Error loading page:", e);
    }
    
    await browser.close();
})();
