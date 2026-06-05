const fs = require('fs');
const report = JSON.parse(fs.readFileSync('lighthouse_report.json', 'utf8'));

const categories = report.categories;
const scores = {
    performance: categories.performance.score * 100,
    accessibility: categories.accessibility.score * 100,
    bestPractices: categories['best-practices'].score * 100,
    seo: categories.seo.score * 100
};

console.log('Lighthouse Scores:');
console.log(JSON.stringify(scores, null, 2));

console.log('\nTop Performance Opportunities:');
const audits = report.audits;
const opportunities = Object.values(audits)
    .filter(audit => audit.details && audit.details.type === 'opportunity' && audit.score < 1)
    .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
    .slice(0, 5);

opportunities.forEach(op => {
    console.log(`- ${op.title}: ${op.displayValue} (${op.details.overallSavingsMs}ms)`);
});

console.log('\nAccessibility Issues:');
const accessibilityIssues = Object.values(audits)
    .filter(audit => audit.id.startsWith('accessibility-') || (report.categories.accessibility.auditRefs.some(ref => ref.id === audit.id) && audit.score < 1))
    .slice(0, 5);

accessibilityIssues.forEach(issue => {
    console.log(`- ${issue.title}: ${issue.description}`);
});
