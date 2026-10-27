import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // ConfigModule membaca file .env saat AppModule di-import (bukan saat compile()),
    // jadi NODE_ENV harus sudah "test" sebelum file test di-load -> pakai env ini,
    // supaya yang terbaca adalah .env.test (database portfolio_blog_test).
    env: { NODE_ENV: 'test' },
  },
});
