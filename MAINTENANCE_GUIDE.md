# Project Maintenance Guide

**Last Updated:** 2025-10-04
**Version:** 1.1.0

This guide provides comprehensive instructions for maintaining the Open Hivemind project, including development workflows, deployment procedures, and troubleshooting.

## 📋 Table of Contents

1. [Development Setup](#development-setup)
2. [Daily Development Workflow](#daily-development-workflow)
3. [CI/CD Pipeline Management](#cicd-pipeline-management)
4. [Deployment Procedures](#deployment-procedures)
5. [Testing Guidelines](#testing-guidelines)
6. [Troubleshooting](#troubleshooting)
7. [Performance Monitoring](#performance-monitoring)
8. [Security Maintenance](#security-maintenance)

## 🔧 Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git >= 2.30.0

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/matthewhand/open-hivemind.git
cd open-hivemind

# Validate development environment
./scripts/validate-dev.sh

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env with your configuration

# Start development servers
npm run dev
```

### Environment Configuration
Key environment variables to configure:

```bash
# Database
DATABASE_URL=sqlite:./data/hivemind.db

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Development
NODE_ENV=development
DEBUG=app:*

# Frontend
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 🚀 Daily Development Workflow

### 1. Start Your Day
```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Validate environment
./scripts/validate-dev.sh

# Start development
npm run dev
```

### 2. Making Changes
```bash
# Make your changes...

# Run type checking
npm run check-types

# Run linting
npm run lint

# Run tests
npm run test

# Build project to verify
npm run build:full
```

### 3. Committing Changes
```bash
# Stage changes
git add .

# Commit with conventional commits
git commit -m "feat: add new feature description"

# Push to remote
git push origin feature/your-feature-name
```

### 4. Creating Pull Requests
1. Create PR from your feature branch to `main`
2. Ensure all CI checks pass
3. Request code review
4. Merge after approval

## 🔄 CI/CD Pipeline Management

### Workflow Overview
The project uses GitHub Actions with the following workflows:

1. **CI Fast (Build & Quality)** - Quick validation on every push
2. **Integration Tests** - Full integration test suite
3. **Unit Tests** - Unit test suite
4. **WebSocket & Special Tests** - WebSocket and specialized tests

### CI Workflow Files
- `.github/workflows/ci-fast.yml` - Main CI pipeline
- `.github/workflows/integration-tests.yml` - Integration tests
- `.github/workflows/unit-tests.yml` - Unit tests
- `.github/workflows/websocket-tests.yml` - WebSocket tests

### Common CI Issues and Solutions

#### Build Failures
```bash
# Local build troubleshooting
npm run build:full

# Clear build cache
rm -rf dist/
npm run build:full

# Clear node modules (last resort)
rm -rf node_modules package-lock.json
npm install
```

#### Test Failures
```bash
# Run tests locally
npm run test

# Run specific test file
npm run test -- --testPathPattern=specific-test

# Debug tests
npm run test:debug
```

## 🚀 Deployment Procedures

### Automated Deployment
```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

### Manual Deployment

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Netlify Deployment
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login to Netlify
netlify login

# Deploy to preview
netlify deploy --dir=dist/client

# Deploy to production
netlify deploy --prod --dir=dist/client
```

### Pre-Deployment Checklist
- [ ] All tests passing locally
- [ ] Build completes successfully
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security scan passed
- [ ] Performance benchmarks met

### Post-Deployment Verification
- [ ] Application loads successfully
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] WebSocket connections functional
- [ ] Error rates within acceptable range

## 🧪 Testing Guidelines

### Test Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── api/           # API tests
├── webhook/       # Webhook tests
└── e2e/           # End-to-end tests
```

### Running Tests
```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:only:backend

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:monitor

# Debug tests
npm run test:debug
```

### Writing Tests
```typescript
// Example unit test
import { MyService } from '../../src/services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should do something', () => {
    expect(service.doSomething()).toBe(true);
  });
});
```

### Test Best Practices
- Write descriptive test names
- Use AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test edge cases and error conditions
- Keep tests focused and independent

## 🔧 Troubleshooting

### Common Issues

#### Build Issues
**Problem**: Module not found errors
```bash
# Solution: Check exports and imports
grep -r "export" src/client/src/hooks/
grep -r "import" src/client/src/
```

**Problem**: TypeScript compilation errors
```bash
# Solution: Check types
npm run check-types

# Update types if needed
npm update
```

#### Runtime Issues
**Problem**: Application won't start
```bash
# Check logs
npm run start

# Check environment
printenv | grep NODE_ENV

# Check configuration
cat config/default.json
```

**Problem**: Database connection issues
```bash
# Check database file
ls -la data/

# Check database configuration
cat config/database.json

# Reset database if needed
rm data/hivemind.db
npm run start
```

#### Performance Issues
**Problem**: Slow startup
```bash
# Check Node.js version
node --version

# Check memory usage
node --max-old-space-size=512 dist/src/index.js

# Profile application
npm run start -- --prof
```

### Debugging Tools
```bash
# Debug with Chrome DevTools
node --inspect dist/src/index.js

# Debug with VS Code
# Create .vscode/launch.json configuration

# Memory profiling
node --prof dist/src/index.js
node --prof-process isolate-*.log > processed.txt
```

## 📊 Performance Monitoring

### Key Metrics to Monitor
- Response times (API endpoints)
- Error rates
- Memory usage
- CPU usage
- Database query performance
- WebSocket connection health

### Monitoring Tools
- Application logs (`logs/` directory)
- System metrics (top, htop)
- Error tracking (Sentry, if configured)
- Performance monitoring (New Relic, DataDog, if configured)

### Performance Optimization
```bash
# Analyze bundle size
npm run build:frontend
du -sh dist/client/dist/

# Run performance tests
npm run test:e2e

# Profile memory usage
node --inspect dist/src/index.js
```

## 🔒 Security Maintenance

### Regular Security Tasks
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check outdated packages
npm outdated
```

### Security Best Practices
- Keep dependencies updated
- Review security advisories
- Use environment variables for secrets
- Implement proper authentication
- Validate all inputs
- Use HTTPS in production
- Regular security audits

### Security Checklist
- [ ] Dependencies updated
- [ ] No known vulnerabilities
- [ ] Environment variables secured
- [ ] Authentication working correctly
- [ ] Input validation implemented
- [ ] HTTPS enabled
- [ ] Logs reviewed for suspicious activity

## 📝 Maintenance Schedule

### Daily
- [ ] Check CI/CD pipeline status
- [ ] Review application logs
- [ ] Monitor performance metrics
- [ ] Check for security alerts

### Weekly
- [ ] Update dependencies
- [ ] Review and merge pull requests
- [ ] Run security scans
- [ ] Backup database

### Monthly
- [ ] Performance audit
- [ ] Code quality review
- [ ] Documentation updates
- [ ] Security audit

### Quarterly
- [ ] Major dependency updates
- [ ] Architecture review
- [ ] Scalability assessment
- [ ] Disaster recovery testing

## 🆘 Getting Help

### Resources
- [GitHub Issues](https://github.com/matthewhand/open-hivemind/issues)
- [Documentation](./README.md)
- [Release Notes](./RELEASE_SUMMARY.md)

### Commands Reference
```bash
# Development
npm run dev              # Start development servers
npm run build            # Build backend
npm run build:frontend   # Build frontend
npm run build:full       # Build both

# Testing
npm run test             # Run all tests
npm run test:coverage    # Run with coverage
npm run lint             # Run linting
npm run check-types      # Check types

# Deployment
./scripts/deploy.sh staging     # Deploy to staging
./scripts/deploy.sh production  # Deploy to production
./scripts/validate-dev.sh       # Validate environment

# Database
npm run db:migrate      # Run migrations
npm run db:seed         # Seed database
npm run db:reset        # Reset database
```

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
**Co-Authored-By: Claude <noreply@anthropic.com>**