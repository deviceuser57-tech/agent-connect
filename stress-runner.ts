import { runStressTests } from './src/lib/meis-stress-test';

runStressTests().catch(err => {
  console.error('Stress Test Failed:', err);
  process.exit(1);
});
