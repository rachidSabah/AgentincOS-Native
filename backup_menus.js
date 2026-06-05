const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Logging in for menu backup...');
        await page.goto('https://www.infohas.ma/thats-my-admin/', { waitUntil: 'domcontentloaded' });
        await page.fill('input[id="user_login"]', 'infohasSuperAdmin');
        await page.fill('input[id="user_pass"]', 'Santafee@@@@@1972-2907');
        await page.click('input[id="wp-submit"]', { noWaitAfter: true });
        await page.waitForTimeout(15000);

        const backupDir = 'menu_backups';
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

        // 1. Backup Menu Assignments (Locations)
        console.log('Backing up menu locations...');
        await page.goto('https://www.infohas.ma/wp-admin/nav-menus.php?action=locations', { waitUntil: 'domcontentloaded' });
        const locations = await page.evaluate(() => {
            const selects = Array.from(document.querySelectorAll('select[name^="menu-locations"]'));
            return selects.map(s => ({
                location: s.name,
                menu_id: s.value,
                text: s.options[s.selectedIndex].text
            }));
        });
        fs.writeFileSync(`${backupDir}/locations.json`, JSON.stringify(locations, null, 2));
        await page.screenshot({ path: `${backupDir}/locations.png`, fullPage: true });

        // 2. Backup Menu Structures (Screenshots of main menus)
        const menusToBackup = ['mainfr', 'mainen', 'footerNavigation', 'Amp Menu', '404'];
        for (const menuName of menusToBackup) {
            console.log(`Backing up structure for: ${menuName}...`);
            // This is a simplified way to navigate to a specific menu
            await page.goto('https://www.infohas.ma/wp-admin/nav-menus.php', { waitUntil: 'domcontentloaded' });
            
            const menuId = await page.evaluate((name) => {
                const option = Array.from(document.querySelectorAll('#select-menu-to-edit option')).find(o => o.text.includes(name));
                return option ? option.value : null;
            }, menuName);

            if (menuId) {
                await page.goto(`https://www.infohas.ma/wp-admin/nav-menus.php?menu=${menuId}`, { waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(3000);
                await page.screenshot({ path: `${backupDir}/structure_${menuName.replace(/\s+/g, '_')}.png`, fullPage: true });
            }
        }

        console.log('Menu backup completed successfully.');

    } catch (error) {
        console.error('Error during menu backup:', error);
    } finally {
        await browser.close();
    }
})();
