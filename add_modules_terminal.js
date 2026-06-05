import { chromium } from 'playwright';

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
    
    console.log('Logging in...');
    await page.goto('https://admin.cabincrew.academy/');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000); // Wait for login to complete
    
    console.log('Navigating to modules...');
    // Find the modules link in the navigation
    await page.click('text=Modules'); 
    await page.waitForTimeout(2000);
    
    for (const mod of modules) {
        console.log(`Adding module: ${mod.code} - ${mod.title}`);
        try {
            await page.click('text=Add Module'); // Or whatever the "Add" button is called
            await page.fill('input[name="code"]', mod.code);
            await page.fill('input[name="title"]', mod.title);
            await page.fill('input[name="duration"]', mod.duration.toString());
            await page.click('button:has-text("Save")');
            await page.waitForTimeout(1000);
        } catch (e) {
            console.error(`Failed to add ${mod.code}: ${e.message}`);
        }
    }
    
    await browser.close();
}

run();
