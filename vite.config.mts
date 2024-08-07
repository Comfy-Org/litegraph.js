import { defineConfig, Plugin } from 'vite'
import path from 'path'
import fs from 'fs/promises'

// Workaround for NPM publish root directory
function prepareDistPublish(): Plugin {
  return {
    name: 'copy-package-json',
    apply: 'build',
    async writeBundle() {
      try {
        const files = [
          "README.md",
          "LICENSE"
        ]
        const dist = "dist"
        const distJson = path.resolve(__dirname, "dist/package.json");
        
        // Load package.json and configure for publish
        const packageJson = require('./package.json')
        packageJson.files = packageJson.litegraphjs_files
        delete packageJson.litegraphjs_files
        delete packageJson.scripts.prepack

        const json = JSON.stringify(packageJson, null, 2)
        Promise.all([
          fs.writeFile(distJson, json),
          ...files.map(f => {
            const src = path.resolve(__dirname, f)
            const dest = path.resolve(__dirname, path.join(dist, f))
            return fs.copyFile(src, dest)
          })
        ])
          .catch((ex) => console.error(`Error writing or copying file: ${ex}`))

        console.log(`Parsed & copied package.json to ${distJson}`);
      } catch (ex) {
        console.error(`Error writing or copying file: ${ex}`)
      }
    }
  }
}

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/litegraph.js'),
      name: 'litegraph.js',
      fileName: () => 'src/litegraph.js',
      formats: ['iife']
    },
    minify: false,
    sourcemap: true,
  },
  plugins: [
    prepareDistPublish()
  ]
})