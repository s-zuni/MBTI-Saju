
import { calculateSaju } from '../api/_utils/saju';

try {
    const result = calculateSaju('1995-12-15', '14:30');
    console.log('--- Saju Calculation Result ---');
    console.log('Day Master:', result.dayMaster.korean, `(${result.dayMaster.chinese})`);
    console.log('Day Master Description:', result.dayMaster.description);
    
    console.log('\n--- Pillars ---');
    (Object.entries(result.pillars) as [string, any][]).forEach(([key, pillar]) => {
        console.log(`[${key.toUpperCase()}]`);
        console.log(`  Gan: ${pillar.gan}, Zhi: ${pillar.zhi}`);
        console.log(`  ShiShen (Gan): ${pillar.ganShiShen}`);
        console.log(`  ShiShen (Zhi): ${pillar.zhiShiShen}`);
        console.log(`  Hidden Stems: ${pillar.hiddenStems.join(', ')}`);
        console.log(`  12 Stages: ${pillar.twelveStages}`);
        console.log(`  12 Spirits: ${pillar.twelveSpirits}`);
    });

    console.log('\n--- Element Ratio ---');
    console.log(result.elementRatio);

} catch (error) {
    console.error('Calculation failed:', error);
}
