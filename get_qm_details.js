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

        console.log('Navigating to homepage...');
        await page.goto('https://www.infohas.ma/', { waitUntil: 'networkidle' });

        const qmData = await page.evaluate(() => {
            const data = {};
            // Summary from admin bar
            const qmSummary = document.querySelector('#wp-admin-bar-query-monitor');
            if (qmSummary) data.summary = qmSummary.innerText;

            // QM often injects data into the footer even if not "opened"
            // Let's try to find the output elements
            const time = document.querySelector('.qm-overview-time .qm-value');
            if (time) data.generation_time = time.innerText;
            
            const dbTime = document.querySelector('.qm-overview-db_queries .qm-value');
            if (dbTime) data.db_time = dbTime.innerText;

            const queries = document.querySelector('.qm-overview-queries .qm-value');
            if (queries) data.query_count = queries.innerText;
            
            // Try to find slow components
            const slowQueries = Array.from(document.querySelectorAll('#qm-queries-slow table tbody tr')).map(tr => tr.innerText.trim());
            data.slow_queries = slowQueries;

            // Check for expensive plugins via the "Queries by Component" section if visible
            const componentQueries = Array.from(document.querySelectorAll('#qm-queries-component table tbody tr')).map(tr => {
                const cols = tr.querySelectorAll('td');
                return cols.length >= 4 ? { name: cols[0].innerText, count: cols[1].innerText, time: cols[3].innerText } : null;
            }).filter(i => i);
            data.components = componentQueries;

            return data;
        });

        console.log('Detailed QM Data:', JSON.stringify(qmData, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
