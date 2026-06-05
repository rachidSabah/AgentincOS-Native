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
        await page.waitForTimeout(15000); 

        console.log('Navigating to WP Rocket Settings...');
        await page.goto('https://www.infohas.ma/wp-admin/options-general.php?page=wprocket', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        const title = await page.title();
        console.log('Current Page Title:', title);
        
        if (title.toLowerCase().includes('rocket')) {
            console.log('Successfully reached WP Rocket settings.');
        } else {
            console.log('Failed to reach settings. Current URL:', page.url());
            await page.screenshot({ path: 'settings_fail.png' });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
