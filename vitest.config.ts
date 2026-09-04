import { defineConfig, type Plugin } from 'vitest/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveTypeScriptPlugin(): Plugin {
    return {
        name: 'resolve-ts-from-js',
        enforce: 'pre',
        resolveId(source, importer) {
            if (!source.endsWith('.js') || !importer) return null;
            
            const jsPath = resolve(dirname(importer), source);
            if (fs.existsSync(jsPath)) return null;

            const tsPath = jsPath.replace(/\.js$/, '.ts');
            if (fs.existsSync(tsPath)) return tsPath;

            return null;
        },
    };
}

export default defineConfig({
    plugins: [
        resolveTypeScriptPlugin(),
    ],
    test: {
        environment: 'node',
        include:     ['src/backend/__tests__/**/*.test.ts'],
        isolate:     true,
        // Cada suite levanta su propio ReplicaSet de MongoDB en memoria;
        // ejecutarlas en serie evita 3 procesos mongod simultáneos (timeouts en CI/Windows).
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 120_000,
        env: {
            NODE_ENV:    'test',
            JWT_SECRET:  'test_jwt_secret_at_least_32_chars_long_for_hs256',
            MONGODB_URI: 'mongodb://localhost:27017/test',
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './'),
        },
    },
});
