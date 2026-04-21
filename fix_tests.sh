#!/bin/bash

# Fix playwright syntax error:
# Before:
#  },
#  },
#  /* Metadata for test organization */
#  metadata: {
#    'Test Environment': process.env.NODE_ENV || 'test',
# We need to remove the extra closing brace.

sed -i '118d' playwright.config.ts
