const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    // Launch non-headless so the user can see what's happening
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Running PageSpeed Insights test...');
        await page.goto('https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.infohas.ma%2F', { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        // Wait for the results to load (this can take a while)
        console.log('Waiting for PageSpeed results to calculate (approx 30-60s)...');
        await page.waitForSelector('.lh-gauge__percentage', { state: 'attached', timeout: 120000 });
        
        // Wait a bit more for the UI to fully settle
        await page.waitForTimeout(5000);

        const scores = await page.evaluate(() => {
            const gauges = Array.from(document.querySelectorAll('.lh-gauge__percentage'));
            return gauges.map(g => g.textContent);
        });

        console.log('PageSpeed Scores (Mobile/Desktop view may vary based on default tab):', scores);
        
        // Take a screenshot of the results
        await page.screenshot({ path: 'pagespeed_before.png', fullPage: true });
        console.log('Screenshot saved as pagespeed_before.png');

    } catch (error) {
        console.error('Error during PageSpeed test:', error);
    } finally {
        await browser.close();
    }
})();
