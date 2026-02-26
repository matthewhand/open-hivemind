#!/usr/bin/env node

/**
 * DaisyUI Component Verification Script
 * This script verifies that all DaisyUI components can be imported and have the expected structure.
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/client/src/components/DaisyUI');
const INDEX_FILE = path.join(COMPONENTS_DIR, 'index.ts');

// Expected components list
const EXPECTED_COMPONENTS = [
  // Core UI Components
  'Accordion',
  'Avatar', 
  'Badge',
  'Breadcrumbs',
  'Carousel',
  'Chat',
  'DataTable',
  'Loading',
  'Modal',
  'ModalForm',
  'StatsCards',
  'StepWizard',
  'Timeline',
  'ToastNotification',
  'VisualFeedback',
  
  // Navigation Components
  'DrawerNavigation',
  'MobileDrawer',
  'NavbarWithSearch',
  'HamburgerMenu',
  'Drawer',
  
  // Form & Input Components
  'FileUpload',
  'Dropdown',
  'RangeSlider',
  
  // Utility Components
  'Kbd',
  'Tooltip',
  'ProgressBar',
  'Countdown',
  'Mockup',
  
  // Advanced Components
  'AdvancedThemeSwitcher',
  'DashboardWidgetSystem'
];

console.log('🔍 DaisyUI Component Verification\n');

// Check if components directory exists
if (!fs.existsSync(COMPONENTS_DIR)) {
  console.error('❌ Components directory not found:', COMPONENTS_DIR);
  process.exit(1);
}

// Check if index.ts exists
if (!fs.existsSync(INDEX_FILE)) {
  console.error('❌ Index file not found:', INDEX_FILE);
  process.exit(1);
}

// Read and parse index file
const indexContent = fs.readFileSync(INDEX_FILE, 'utf8');
const exportedComponents = [];

// Extract exported component names
const exportRegex = /export\s+{\s*default\s+as\s+(\w+)\s*}\s+from\s+['"]\.\/([\w]+)['"]/g;
let match;

while ((match = exportRegex.exec(indexContent)) !== null) {
  exportedComponents.push(match[1]);
}

console.log('📦 Components found in index.ts:', exportedComponents.length);

// Check for missing components
const missingComponents = EXPECTED_COMPONENTS.filter(comp => !exportedComponents.includes(comp));
const extraComponents = exportedComponents.filter(comp => !EXPECTED_COMPONENTS.includes(comp));

if (missingComponents.length > 0) {
  console.log('⚠️  Missing components:', missingComponents.join(', '));
}

if (extraComponents.length > 0) {
  console.log('➕ Extra components:', extraComponents.join(', '));
}

// Check individual component files
let validComponents = 0;
let invalidComponents = 0;

console.log('\n🔍 Verifying individual component files:\n');

for (const component of exportedComponents) {
  const componentFile = path.join(COMPONENTS_DIR, `${component}.tsx`);
  
  if (fs.existsSync(componentFile)) {
    const content = fs.readFileSync(componentFile, 'utf8');
    
    // Basic checks
    const hasReactImport = content.includes('import React');
    const hasExportDefault = content.includes('export default');
    const hasComponent = content.includes(`${component}:`);
    
    if (hasReactImport && hasExportDefault) {
      console.log(`✅ ${component} - Valid`);
      validComponents++;
    } else {
      console.log(`⚠️  ${component} - Missing React import or export default`);
      invalidComponents++;
    }
  } else {
    console.log(`❌ ${component} - File not found`);
    invalidComponents++;
  }
}

// Summary
console.log('\n📊 Summary:');
console.log(`Total expected components: ${EXPECTED_COMPONENTS.length}`);
console.log(`Components in index.ts: ${exportedComponents.length}`);
console.log(`Valid component files: ${validComponents}`);
console.log(`Invalid/missing files: ${invalidComponents}`);
console.log(`Missing from index: ${missingComponents.length}`);
console.log(`Extra in index: ${extraComponents.length}`);

// Overall status
const allGood = (
  missingComponents.length === 0 &&
  invalidComponents === 0 &&
  validComponents >= EXPECTED_COMPONENTS.length
);

if (allGood) {
  console.log('\n🎉 All DaisyUI components are properly configured!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some issues found with DaisyUI components.');
  process.exit(1);
}