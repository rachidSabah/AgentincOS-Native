const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'domcontentloaded' });
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        
        console.log('Waiting for login redirect...');
        await page.waitForTimeout(10000); 

        console.log('Navigating to homepage...');
        await page.goto('https://www.infohas.ma/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        const qmBarText = await page.evaluate(() => {
            const bar = document.querySelector('#wp-admin-bar-query-monitor');
            return bar ? bar.innerText : 'Admin bar item not found';
        });

        console.log('Query Monitor Admin Bar Summary:', qmBarText);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
