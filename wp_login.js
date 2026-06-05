const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('Navigating to login page...');
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log('Filling login form...');
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        
        console.log('Clicking login button...');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        
        console.log('Waiting for dashboard...');
        await page.waitForSelector('#wpadminbar', { timeout: 60000 });
        
        console.log('Taking screenshot of dashboard...');
        await page.screenshot({ path: 'dashboard.png', fullPage: true });
        
        const url = page.url();
        const title = await page.title();
        console.log('Current URL:', url);
        console.log('Page Title:', title);
        
        if (url.includes('wp-admin')) {
            console.log('Login successful!');
        } else {
            console.log('Login might have failed or redirect occurred.');
        }

    } catch (error) {
        console.error('Error during login:', error);
        await page.screenshot({ path: 'error_login.png' });
    } finally {
        await browser.close();
    }
})();
