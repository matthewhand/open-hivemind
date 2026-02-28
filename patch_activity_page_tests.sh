#!/bin/bash
sed -i "s/import { render, screen, waitFor } from '@testing-library\/react';/import React from 'react';\nimport { render, screen, waitFor } from '@testing-library\/react';/g" tests/unit/ActivityPage.test.ts
sed -i "s/import { render, screen, waitFor } from '@testing-library\/react';/import React from 'react';\nimport { render, screen, waitFor } from '@testing-library\/react';/g" tests/e2e/activity-page.test.ts
