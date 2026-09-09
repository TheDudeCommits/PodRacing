import { defineConfig } from 'vitest/config';
export default defineConfig({resolve:{preserveSymlinks:true},test:{include:['tests/**/*.test.ts'],maxWorkers:1,fileParallelism:false}});
