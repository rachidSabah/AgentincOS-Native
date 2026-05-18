const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.infohas.ma/', { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        
        console.log('Verification Report:');
        console.log('1. Script Deferring:', html.includes('defer="defer"') ? 'PASS' : 'FAIL (Wait for Cache)');
        console.log('2. Resource Hints (preconnect):', html.includes('preconnect') ? 'PASS' : 'FAIL');
        console.log('3. OWL Async Loading:', html.includes('onload="this.media=\'all\'"') ? 'PASS' : 'FAIL');
        console.log('4. Conditional reCAPTCHA Removal:', !html.includes('recaptcha/api.js') ? 'PASS' : 'FAIL (reCAPTCHA still present)');
        
        await page.screenshot({ path: 'live_verification.png' });
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
