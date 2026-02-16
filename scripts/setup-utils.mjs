/**
 * Utility functions for setup scripts
 * Provides logging, command execution, and user input helpers
 */

import { execSync } from 'child_process';
import { createInterface } from 'readline';

// ANSI colors for terminal output
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Logging helpers with colored output
export const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (step, total, msg) => console.log(`${colors.bright}[${step}/${total}]${colors.reset} ${msg}`),
};

/**
 * Execute command silently and return success/failure
 * @param {string} command - Command to execute
 * @returns {boolean} True if successful, false otherwise
 */
export function execSilent(command) {
  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute command and return output
 * @param {string} command - Command to execute
 * @returns {string|null} Command output or null if failed
 */
export function execOutput(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return null;
  }
}

/**
 * Ask user a yes/no question
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} True if yes, false if no
 */
export function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${colors.cyan}?${colors.reset} ${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Ask user for input with optional default value
 * @param {string} question - Question to ask
 * @param {string} defaultValue - Default value if user presses enter
 * @returns {Promise<string>} User input or default value
 */
export function askInput(question, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = defaultValue 
      ? `${colors.cyan}?${colors.reset} ${question} (default: ${defaultValue}): `
      : `${colors.cyan}?${colors.reset} ${question}: `;

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}
