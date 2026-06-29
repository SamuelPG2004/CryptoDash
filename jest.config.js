/**
 * jest.config.js — Mantenido para compatibilidad con el test de React (App.test.tsx).
 *
 * NOTA: Los tests de integración de backend ahora usan Vitest (vitest.config.ts).
 * Jest se mantiene solo para los tests de React en src/__tests__/ que usan
 * @testing-library/react — librería que tiene mejor integración con Jest/jsdom.
 *
 * En el futuro se puede migrar App.test.tsx a Vitest también (soporta @testing-library).
 */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [],  // Sin test match — todos los tests corren con Vitest ahora
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
