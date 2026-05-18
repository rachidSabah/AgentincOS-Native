const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'networkidle' });
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        await page.waitForSelector('#wpadminbar', { timeout: 60000 });

        const backupDir = 'backups';
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

        const filesToBackup = [
            { name: 'functions.php', url: 'https://www.infohas.ma/wp-admin/theme-editor.php?file=functions.php' },
            { name: 'header.php', url: 'https://www.infohas.ma/wp-admin/theme-editor.php?file=header.php' }
        ];

        for (const file of filesToBackup) {
            console.log(`Backing up ${file.name}...`);
            await page.goto(file.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
            await page.waitForTimeout(5000); // Wait for potential async loads
            const content = await page.evaluate(() => document.querySelector('#newcontent')?.value);
            if (content) {
                fs.writeFileSync(`${backupDir}/${file.name}`, content);
                console.log(`Saved ${file.name}`);
            } else {
                console.log(`Could not find content for ${file.name}. Current URL: ${page.url()}`);
                await page.screenshot({ path: `backup_error_${file.name}.png` });
            }
        }

        console.log('Checking for Custom CSS in Customizer...');
        await page.goto('https://www.infohas.ma/wp-admin/customize.php', { waitUntil: 'networkidle' });
        // Customizer is an iframe, might be tricky. 
        // Alternatively, check Avada Options if it has custom CSS.
        
        console.log('Checking Avada Custom CSS...');
        await page.goto('https://www.infohas.ma/wp-admin/admin.php?page=avada_options#custom_css', { waitUntil: 'networkidle' });
        // Avada uses complex JS for its options. Let's try to find the textarea.
        const avadaCss = await page.evaluate(() => {
            const textarea = document.querySelector('textarea[name="avada_options[custom_css]"]') || document.querySelector('.ace_text-input');
            // If it's Ace editor, it's harder to get value directly from textarea.
            return textarea ? textarea.value : 'Could not find Avada Custom CSS';
        });
        fs.writeFileSync(`${backupDir}/avada_custom_css.txt`, avadaCss);
        console.log('Saved Avada Custom CSS');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
