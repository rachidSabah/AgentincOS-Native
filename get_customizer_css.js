const { chromium } = require('playwright');
const fs = require('fs');

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

        console.log('Navigating to Customizer -> Custom CSS...');
        await page.goto('https://www.infohas.ma/wp-admin/customize.php?autofocus[section]=custom_css', { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        await page.waitForTimeout(15000); 

        const customCss = await page.evaluate(() => {
            const textarea = document.querySelector('.wp-full-overlay-sidebar-content textarea');
            return textarea ? textarea.value : null;
        });

        if (customCss) {
            fs.writeFileSync('backups/customizer_css.css', customCss);
            console.log('Saved Customizer Custom CSS');
        } else {
            console.log('Could not find Customizer Custom CSS.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
