#!/usr/bin/env node
// Backup wrapper for run-migrations.js
module.exports = require('./run-migrations');
'use strict';

/**
 * EWTCS Database Migration Runner
 * Purpose: Manage database schema migrations with encryption support
 * Features: Version control, rollback, status tracking, encrypted secrets
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createDecipheriv, scryptSync } = require('crypto');
const dotenv = require('dotenv');

const SALT = 'EWTCS_SALT_2026';
const DEFAULT_ENV = 'development';

const loadEnvFiles = () => {
	const nodeEnv = process.env.NODE_ENV || DEFAULT_ENV;
	#!/usr/bin/env node
	// Backup wrapper for run-migrations.js — keep minimal to stay under 200 lines
	module.exports = require('./run-migrations');
