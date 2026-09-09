import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'node',maxWorkers:1,fileParallelism:false,include:['assets/source/inkstorm/combat-round35/v23-contact-edge-preparation/baseline-diagnostic.test.ts']}});
