#!/usr/bin/env node

import { startServer } from './index.js'

startServer(process.argv[2]).catch((error: Error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
}) 