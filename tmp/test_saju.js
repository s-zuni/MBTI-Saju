const { Solar, Lunar } = require('lunar-javascript');

const solar = Solar.fromYmdHms(1995, 3, 24, 12, 30, 0);
const lunar = solar.getLunar();
const eightChar = lunar.getEightChar();

console.log('--- 12 Spirits (ShenSha) Test ---');
try {
    console.log('Year ShenSha:', eightChar.getYearShenSha());
    console.log('Month ShenSha:', eightChar.getMonthShenSha());
    console.log('Day ShenSha:', eightChar.getDayShenSha());
    console.log('Time ShenSha:', eightChar.getTimeShenSha());
} catch (e) {
    console.log('ShenSha methods not directly in EightChar:', e.message);
}

// In lunar-javascript, ShenSha is often in the Lunar object relative to the day/year
console.log('Lunar Year ShenSha:', lunar.getYearShengXiao());
// The 12 Spirits (장성살, etc.) are often specific to "12神煞"
