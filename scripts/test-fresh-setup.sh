#!/bin/bash

# Test Fresh Setup Script
# This script simulates a fresh setup to catch issues before they reach CI/CD
# Usage: ./scripts/test-fresh-setup.sh

set -e  # Exit on any error

echo "🧪 Testing Fresh Setup Process"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to print status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
    OVERALL_STATUS=1
  fi
}

# Function to print section header
print_section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Check if .env.local exists
print_section "Step 1: Environment Setup Check"

if [ ! -f .env.local ]; then
  echo -e "${YELLOW}⚠️  .env.local not found${NC}"
  echo "Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo -e "${YELLOW}⚠️  Please update .env.local with your actual values${NC}"
  echo "Then run this script again."
  exit 1
fi

print_status 0 ".env.local exists"

# Validate .env.example
print_section "Step 2: Validate Environment Configuration"

if node scripts/validate-env-example.js; then
  print_status 0 "Environment configuration valid"
else
  print_status 1 "Environment configuration invalid"
fi

# Check Node.js version
print_section "Step 3: Check Node.js Version"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
  print_status 0 "Node.js version $(node -v) is compatible"
else
  print_status 1 "Node.js version $(node -v) is too old (need v18+)"
fi

# Install dependencies
print_section "Step 4: Install Dependencies"

echo "Running npm ci..."
if npm ci --quiet; then
  print_status 0 "Dependencies installed successfully"
else
  print_status 1 "Failed to install dependencies"
fi

# Check for security vulnerabilities
print_section "Step 5: Security Audit"

echo "Checking for security vulnerabilities..."
if npm audit --audit-level=high > /dev/null 2>&1; then
  print_status 0 "No high/critical vulnerabilities found"
else
  print_status 1 "Security vulnerabilities detected (run: npm audit)"
fi

# Validate database connection
print_section "Step 6: Database Connection"

if node scripts/validate-db-connection.js; then
  print_status 0 "Database connection successful"
else
  print_status 1 "Database connection failed"
fi

# Run migrations
print_section "Step 7: Database Migrations"

echo "Running database migrations..."
if npm run db:migrate > /dev/null 2>&1; then
  print_status 0 "Migrations applied successfully"
else
  print_status 1 "Migration failed"
fi

# Validate migrations
print_section "Step 8: Validate Migrations"

if node scripts/validate-migrations.js; then
  print_status 0 "All migrations validated"
else
  print_status 1 "Migration validation failed"
fi

# Validate database schema
print_section "Step 9: Validate Database Schema"

if node scripts/validate-db-schema.js; then
  print_status 0 "Database schema valid"
else
  print_status 1 "Database schema validation failed"
fi

# Test migration rollback
print_section "Step 10: Test Migration Rollback"

echo "Testing migration rollback..."
if npm run db:rollback > /dev/null 2>&1; then
  print_status 0 "Rollback successful"
  
  echo "Re-applying migrations..."
  if npm run db:migrate > /dev/null 2>&1; then
    print_status 0 "Re-migration successful"
  else
    print_status 1 "Re-migration failed"
  fi
else
  print_status 1 "Rollback failed"
fi

# TypeScript type checking
print_section "Step 11: TypeScript Type Checking"

echo "Running TypeScript type checking..."
if npx tsc --noEmit; then
  print_status 0 "TypeScript type checking passed"
else
  print_status 1 "TypeScript errors found"
fi

# Build application
print_section "Step 12: Build Application"

echo "Building application (this may take a minute)..."
if npm run build > /dev/null 2>&1; then
  print_status 0 "Build successful"
else
  print_status 1 "Build failed"
fi

# Verify build output
if [ -d .next ]; then
  print_status 0 "Build output directory exists"
else
  print_status 1 "Build output directory missing"
fi

# Final summary
print_section "Test Summary"

if [ $OVERALL_STATUS -eq 0 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Your setup is ready! You can now:"
  echo "  • Run the development server: npm run dev"
  echo "  • Submit your PR with confidence"
  echo ""
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Please fix the issues above before submitting your PR."
  echo "For help, see PRE_MERGE_VALIDATION.md"
  echo ""
  exit 1
fi
