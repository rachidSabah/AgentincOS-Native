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

        console.log('Navigating to Avada Options -> Custom CSS...');
        await page.goto('https://www.infohas.ma/wp-admin/admin.php?page=avada_options#custom_css', { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        // Avada Options page takes time to initialize the Ace editor.
        await page.waitForTimeout(10000); 

        const customCss = await page.evaluate(() => {
            // Try to get from Ace editor if present
            const aceEditor = document.querySelector('.ace_text-input');
            if (aceEditor) {
                // This might not work directly. Let's try to get it from the hidden textarea that Avada syncs with.
                return document.querySelector('textarea[name="avada_options[custom_css]"]')?.value;
            }
            return document.querySelector('textarea[name="avada_options[custom_css]"]')?.value;
        });

        if (customCss) {
            fs.writeFileSync('backups/avada_custom_css.css', customCss);
            console.log('Saved Avada Custom CSS');
        } else {
            console.log('Could not find Avada Custom CSS. Taking screenshot...');
            await page.screenshot({ path: 'avada_options_debug.png' });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
