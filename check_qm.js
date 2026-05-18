const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Logging in to check Query Monitor...');
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'domcontentloaded' });
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        await page.waitForSelector('#wpadminbar', { timeout: 60000 });

        console.log('Navigating to the homepage to trigger Query Monitor collection...');
        await page.goto('https://www.infohas.ma/', { waitUntil: 'networkidle' });

        // Query Monitor usually adds an entry to the admin bar. 
        // We can often get the data by looking for the QM footer or headers.
        // Let's try to extract the summary data from the admin bar.
        
        console.log('Extracting Query Monitor Summary...');
        const qmSummary = await page.evaluate(() => {
            const qmNode = document.querySelector('#wp-admin-bar-query-monitor');
            if (!qmNode) return 'Query Monitor bar not found in admin bar. Check if plugin is active and visible for admins.';
            
            // Extract text from the bar (usually shows Time, Memory, Queries)
            return qmNode.innerText;
        });
        console.log('QM Summary (Admin Bar):', qmSummary);

        console.log('Taking screenshot of Query Monitor overview...');
        // Open QM by clicking the admin bar entry
        await page.click('#wp-admin-bar-query-monitor');
        await page.waitForSelector('#qm', { timeout: 10000 });
        
        const qmDetails = await page.evaluate(() => {
            const time = document.querySelector('.qm-overview-time .qm-value')?.innerText;
            const queries = document.querySelector('.qm-overview-queries .qm-value')?.innerText;
            const memory = document.querySelector('.qm-overview-memory .qm-value')?.innerText;
            
            const slowQueries = Array.from(document.querySelectorAll('#qm-queries-slow table tbody tr')).map(tr => tr.innerText);
            
            return { time, queries, memory, slowQueries: slowQueries.slice(0, 5) };
        });
        
        console.log('QM Details:', JSON.stringify(qmDetails, null, 2));
        await page.screenshot({ path: 'query_monitor_live.png' });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
