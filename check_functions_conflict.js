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
        await page.waitForSelector('#wpadminbar');

        console.log('Navigating to Theme Editor...');
        await page.goto('https://www.infohas.ma/wp-admin/theme-editor.php', { waitUntil: 'domcontentloaded' });
        
        const files = await page.evaluate(() => {
            const list = document.querySelector('ul.file-list') || document.querySelector('#theme-files');
            if (!list) return 'File list not found';
            return Array.from(list.querySelectorAll('li a')).map(a => a.innerText);
        });
        
        console.log('Theme Files Found:', files);

        // Also check content of both if they exist to see which one is the "real" one
        const checkFile = async (filename) => {
            await page.goto(`https://www.infohas.ma/wp-admin/theme-editor.php?file=${filename}`, { waitUntil: 'domcontentloaded' });
            const content = await page.evaluate(() => document.querySelector('#newcontent')?.value);
            return content ? content.substring(0, 100) : 'Empty or not found';
        };

        if (Array.isArray(files)) {
            if (files.includes('function.php')) {
                console.log('Content of function.php (start):', await checkFile('function.php'));
            }
            if (files.includes('functions.php')) {
                console.log('Content of functions.php (start):', await checkFile('functions.php'));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
