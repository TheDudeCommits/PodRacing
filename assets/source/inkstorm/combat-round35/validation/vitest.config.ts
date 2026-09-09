import { defineConfig } from 'vitest/config';
export default defineConfig({ resolve: { preserveSymlinks: true }, test: { include: ['tests/combat/CombatPresentationController.test.ts','tests/galactic/combatPickups.test.ts','tests/galactic/system.test.ts'] } });
