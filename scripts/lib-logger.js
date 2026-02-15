const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function header(msg) {
  console.log(`${COLORS.bright}${COLORS.cyan}${msg}${COLORS.reset}`);
}

function section(msg) {
  console.log(`\n${COLORS.blue}${msg}${COLORS.reset}`);
}

function step(n, msg) {
  console.log(`${COLORS.yellow}[Step ${n}]${COLORS.reset} ${msg}`);
}

function success(msg) {
  console.log(`${COLORS.green}✔ ${msg}${COLORS.reset}`);
}

function info(msg) {
  console.log(`${COLORS.cyan}• ${msg}${COLORS.reset}`);
}

function warn(msg) {
  console.warn(`${COLORS.yellow}⚠ ${msg}${COLORS.reset}`);
}

function error(msg) {
  console.error(`${COLORS.red}✖ ${msg}${COLORS.reset}`);
}

const log = { header, section, step, success, info, warn, error };

module.exports = { log, COLORS };
