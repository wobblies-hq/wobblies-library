#!/usr/bin/env node
import { executeCli } from './src/wobbly-cli/cli';

const exitCode = await executeCli({ argv: process.argv.slice(2) });
process.exitCode = exitCode;
