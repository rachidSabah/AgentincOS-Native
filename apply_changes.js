const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    // Launch non-headless so the user can see what's happening
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    context.setDefaultTimeout(120000);
    const page = await context.newPage();

    try {
        console.log('Logging in to apply changes...');
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        await page.waitForSelector('#wpadminbar', { timeout: 120000 });

        const functionsPhpContent = fs.readFileSync('optimized_functions.php', 'utf8');
        const headerPhpContent = fs.readFileSync('optimized_header.php', 'utf8');

        console.log('Navigating to Theme Editor (functions.php)...');
        await page.goto('https://www.infohas.ma/wp-admin/theme-editor.php?file=functions.php', { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForTimeout(5000); // Wait for CodeMirror/Ace to load

        console.log('Applying optimized functions.php...');
        // Using JS to bypass complex editor interaction if possible, or typing it in.
        await page.evaluate((code) => {
            if (window.wp && wp.codeEditor) {
                // If CodeMirror is active
                const editor = document.querySelector('.CodeMirror').CodeMirror;
                editor.setValue(code);
            } else {
                const editor = document.querySelector('#newcontent');
                if (editor) editor.value = code;
            }
        }, functionsPhpContent);
        
        await page.click('#submit', { noWaitAfter: true });
        
        // Wait for the success notice or failure
        await page.waitForFunction(() => {
            const success = document.querySelector('#message.updated');
            const error = document.querySelector('#message.error');
            const ajaxNotice = document.querySelector('.notice-success'); // sometimes it's ajax
            return (success && success.offsetParent !== null) || 
                   (error && error.offsetParent !== null) ||
                   (ajaxNotice && ajaxNotice.offsetParent !== null && ajaxNotice.innerText.includes('succès'));
        }, { timeout: 60000 });
        
        const functionsResult = await page.evaluate(() => {
             const err = document.querySelector('#message.error');
             if(err && err.offsetParent !== null) return 'Error saving functions.php: ' + err.innerText;
             return 'Success';
        });
        console.log('functions.php save result:', functionsResult);

        console.log('Navigating to Theme Editor (header.php)...');
        await page.goto('https://www.infohas.ma/wp-admin/theme-editor.php?file=header.php', { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForTimeout(5000);

        console.log('Applying optimized header.php...');
        await page.evaluate((code) => {
            if (window.wp && wp.codeEditor) {
                const editor = document.querySelector('.CodeMirror').CodeMirror;
                editor.setValue(code);
            } else {
                const editor = document.querySelector('#newcontent');
                if (editor) editor.value = code;
            }
        }, headerPhpContent);
        
        await page.click('#submit', { noWaitAfter: true });
        
        await page.waitForFunction(() => {
            const success = document.querySelector('#message.updated');
            const error = document.querySelector('#message.error');
            const ajaxNotice = document.querySelector('.notice-success');
            return (success && success.offsetParent !== null) || 
                   (error && error.offsetParent !== null) ||
                   (ajaxNotice && ajaxNotice.offsetParent !== null && ajaxNotice.innerText.includes('succès'));
        }, { timeout: 60000 });
        
        const headerResult = await page.evaluate(() => {
             const err = document.querySelector('#message.error');
             if(err && err.offsetParent !== null) return 'Error saving header.php: ' + err.innerText;
             return 'Success';
        });
        console.log('header.php save result:', headerResult);

    } catch (error) {
        console.error('Error applying changes:', error);
    } finally {
        await browser.close();
    }
})();
