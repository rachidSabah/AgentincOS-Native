const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        
        console.log('Waiting for dashboard...');
        await page.waitForSelector('#wpadminbar', { timeout: 120000 });

        console.log('Navigating to plugins page...');
        await page.goto('https://www.infohas.ma/wp-admin/plugins.php', { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        const plugins = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#the-list tr.active'));
            return rows.map(row => {
                const name = row.querySelector('.plugin-title strong')?.innerText;
                const version = row.querySelector('.plugin-version-author-uri')?.innerText;
                return { name, version };
            });
        });
        
        console.log('Active Plugins:', JSON.stringify(plugins, null, 2));

        console.log('Checking Theme...');
        await page.goto('https://www.infohas.ma/wp-admin/themes.php', { waitUntil: 'networkidle' });
        const theme = await page.evaluate(() => {
            const activeTheme = document.querySelector('.theme.active .theme-name')?.innerText;
            return activeTheme;
        });
        console.log('Active Theme:', theme);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
