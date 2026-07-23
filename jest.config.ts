import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'node:fs';

// Leemos tsconfig.json como texto y lo parseamos. NO usamos `import ... from
// './tsconfig.json'` porque con "module": "nodenext" eso exige una import
// attribute (`with { type: 'json' }`) que es frágil entre versiones de Node.
// Leerlo a mano es portable y deja tsconfig como ÚNICA fuente de verdad de los paths.
const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8')) as {
  compilerOptions: { paths: Record<string, string[]> };
};

const config: Config = {
  rootDir: 'src',
  moduleFileExtensions: ['js', 'json', 'ts'],
  // Jest ejecuta cualquier archivo que termine en `.spec.ts`.
  testRegex: '.*\\.spec\\.ts$',
  // ts-jest transpila TS al vuelo para que Jest lo entienda.
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // 🔑 Traduce los alias de tsconfig (@domain/*, @enums/*) a rutas que Jest resuelve.
  // Los paths de tsconfig son relativos a la raíz del proyecto, pero rootDir de Jest
  // es `src`, por eso el prefix sube un nivel con '<rootDir>/../'.
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: '<rootDir>/../',
  }),
};

export default config;
