import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.{test,spec}.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: ['src/generated/**', 'src/**/*.{test,spec}.ts'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@domain': path.resolve(__dirname, 'src/domain'),
            '@application': path.resolve(__dirname, 'src/application'),
            '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
            '@shared': path.resolve(__dirname, 'src/shared'),
        },
    },
});
