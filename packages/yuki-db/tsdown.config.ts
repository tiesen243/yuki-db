import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['cjs', 'esm'],
  nodeProtocol: true,
  dts: true,
  clean: true,
  shims: true,
})
