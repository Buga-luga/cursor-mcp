#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Read package.json
const packageJsonPath = join(rootDir, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version

// Update version in server.ts
const serverPath = join(rootDir, 'src', 'index.ts')
const serverContent = readFileSync(serverPath, 'utf-8')

// Update version in package.json if provided as argument
if (process.argv[2]) {
  const newVersion = process.argv[2]
  packageJson.version = newVersion
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log(`Updated package.json version to ${newVersion}`)
}

console.log('Version update complete') 