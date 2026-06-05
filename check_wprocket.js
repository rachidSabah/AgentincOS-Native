const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        await page.waitForSelector('#wpadminbar', { timeout: 120000 });

        console.log('Navigating to WP Rocket...');
        await page.goto('https://www.infohas.ma/wp-admin/admin.php?page=wprocket', { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        const content = await page.evaluate(() => document.body.innerText);
        console.log('WP Rocket Page contains "WP Rocket est activé":', content.includes('WP Rocket est activé') || content.includes('WP Rocket is active'));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
