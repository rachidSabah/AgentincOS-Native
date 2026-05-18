const { chromium } = require('playwright');

const modules = [
    { code: 'ATAM-01', title: 'Métier et formation', duration: 30 },
    { code: 'ATAM-02', title: 'Outils informatiques', duration: 60 },
    { code: 'ATAM-03', title: 'Communication en français', duration: 120 },
    { code: 'ATAM-04', title: 'Environnement professionnel', duration: 180 },
    { code: 'ATAM-05', title: 'Comportements et attitudes professionnels', duration: 60 },
    { code: 'ATAM-06', title: 'Communication en anglais', duration: 150 },
    { code: 'ATAM-07', title: 'Approche client', duration: 60 },
    { code: 'ATAM-08', title: 'Interaction en situations professionnelles', duration: 75 },
    { code: 'ATAM-09', title: 'Mesures de sûreté', duration: 45 },
    { code: 'ATAM-10', title: 'Marchandises dangereuses', duration: 45 },
    { code: 'ATAM-11', title: 'Procédures de pré- départ', duration: 60 },
    { code: 'ATAM-12', title: 'Embarquement et départ', duration: 60 },
    { code: 'ATAM-13', title: 'Activités d’accueil en milieu de travail (stage 1)', duration: 120 },
    { code: 'ATAM-14', title: 'Premiers secours', duration: 165 },
    { code: 'ATAM-15', title: 'Communication en espagnol', duration: 90 },
    { code: 'ATAM-16', title: 'Service durant la croisière', duration: 120 },
    { code: 'ATAM-17', title: 'Vente de produits à bord', duration: 60 },
    { code: 'ATAM-18', title: 'Procédures d’urgence aériennes', duration: 90 },
    { code: 'ATAM-19', title: 'Procédures d’urgence maritimes', duration: 90 },
    { code: 'ATAM-20', title: 'Arrivée et débarquement', duration: 90 },
    { code: 'ATAM-21', title: 'Recherche d’emploi', duration: 30 },
    { code: 'ATAM-22', title: 'Intégration au milieu de travail (stage 2)', duration: 270 }
];

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        console.log('Navigating to CRM...');
        await page.goto('https://crm-attendance.pages.dev/');
        
        console.log('Logging in...');
        // The previous inspection showed a loading screen, so we might need to wait for the login form.
        // Based on common patterns:
        await page.waitForSelector('input', { timeout: 10000 });
        
        // Let's find inputs by type/placeholder
        await page.fill('input[placeholder="Username"]', 'admi');
        await page.fill('input[placeholder="Password"]', 'admin123');
        await page.fill('input[placeholder="school-name"]', ''); // Leave slug empty
        await page.click('button:has-text("Sign in"), button:has-text("Signing in")');
        
        console.log('Waiting for navigation...');
        await page.waitForTimeout(5000); 
        
        // Take a screenshot to see where we are
        await page.screenshot({ path: 'login_result.png' });
        console.log('Screenshot saved as login_result.png');

        console.log('Navigating to Modules...');
        // Look for "Modules" in the sidebar/nav
        try {
            await page.click('text=Modules', { timeout: 5000 });
        } catch (e) {
            console.log('Modules link not found immediately, trying manual navigation or checking menu...');
            // Sometimes it's under a "Settings" or "Academic" menu
            await page.goto('https://crm-attendance.pages.dev/modules'); // Speculative path
        }
        
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'modules_page.png' });

        for (const mod of modules) {
            console.log(`Processing: ${mod.code} - ${mod.title}`);
            try {
                // Click "Add" button
                await page.click('button:has-text("Add"), button:has-text("New"), [aria-label*="Add"]');
                await page.waitForTimeout(500);
                
                // Fill form
                await page.fill('input[name*="code"], input[placeholder*="Code"]', mod.code);
                await page.fill('input[name*="name"], input[name*="title"], input[placeholder*="Title"]', mod.title);
                await page.fill('input[name*="hours"], input[name*="duration"], input[placeholder*="Hours"]', mod.duration.toString());
                
                // Save
                await page.click('button:has-text("Save"), button:has-text("Create"), button[type="submit"]');
                await page.waitForTimeout(1000);
                console.log(`Successfully added: ${mod.code}`);
            } catch (e) {
                console.error(`Failed to add ${mod.code}: ${e.message}`);
                await page.screenshot({ path: `error_${mod.code}.png` });
            }
        }

    } catch (err) {
        console.error('Critical Error:', err.message);
        await page.screenshot({ path: 'critical_error.png' });
    } finally {
        await browser.close();
    }
}

run();
