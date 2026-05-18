const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Logging in...');
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'domcontentloaded' });
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        await page.waitForTimeout(20000); 

        console.log('Checking Avada Menu Options...');
        await page.goto('https://www.infohas.ma/wp-admin/admin.php?page=avada_options#menu_options', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'avada_menu_options.png', fullPage: true });

        console.log('Checking WordPress Menu Structure...');
        await page.goto('https://www.infohas.ma/wp-admin/nav-menus.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'wp_menu_structure.png', fullPage: true });

        console.log('Checking UberMenu Assets Settings...');
        await page.goto('https://www.infohas.ma/wp-admin/themes.php?page=ubermenu-settings&do=assets', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'ubermenu_assets.png', fullPage: true });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
