/**
 * EmptyState Component - Usage Examples
 *
 * This file demonstrates how to use the EmptyState component and its variants.
 * DO NOT import this file in production code - it's for documentation only.
 */

import React from 'react';
import EmptyState, { NoItemsFound, NoConfiguration, ErrorState } from './EmptyState';
import { Box, AlertCircle, Database } from 'lucide-react';

// Example 1: Basic EmptyState with custom icon and actions
const BasicExample = () => (
  <EmptyState
    icon={Box}
    title="No packages found"
    description="You haven't added any packages yet. Start by creating your first package."
    variant="primary"
    primaryAction={{
      label: 'Create Package',
      icon: Box,
      onClick: () => console.log('Create clicked'),
      variant: 'primary',
    }}
    secondaryAction={{
      label: 'Learn More',
      onClick: () => console.log('Learn more clicked'),
      variant: 'ghost',
    }}
  />
);

// Example 2: NoItemsFound variant - for search results
const SearchEmptyExample = () => (
  <NoItemsFound
    searchQuery="test query"
    itemType="bots"
    onClearSearch={() => console.log('Clear search')}
    onCreateNew={() => console.log('Create new')}
    createLabel="Create Bot"
  />
);

// Example 3: NoItemsFound without search (just empty list)
const EmptyListExample = () => (
  <NoItemsFound
    itemType="configurations"
    onCreateNew={() => console.log('Create new')}
    createLabel="Add Configuration"
  />
);

// Example 4: NoConfiguration variant - for first-time setup
const FirstTimeSetupExample = () => (
  <NoConfiguration
    title="Welcome! Let's get started"
    description="Set up your first AI agent to begin automating your workflows."
    onSetup={() => console.log('Setup clicked')}
    setupLabel="Create First Agent"
    onLearnMore={() => console.log('Learn more')}
  />
);

// Example 5: ErrorState variant - for error conditions
const ErrorExample = () => (
  <ErrorState
    title="Failed to load data"
    description="We couldn't connect to the server. Please check your connection and try again."
    onRetry={() => console.log('Retry clicked')}
    onContactSupport={() => console.log('Contact support')}
    errorMessage="Error: Connection timeout after 30 seconds"
  />
);

// Example 6: Custom empty state with warning variant
const WarningExample = () => (
  <EmptyState
    icon={AlertCircle}
    title="Database not configured"
    description="A database connection is required to use this feature. Please configure your database settings."
    variant="warning"
    primaryAction={{
      label: 'Configure Database',
      icon: Database,
      onClick: () => console.log('Configure clicked'),
      variant: 'primary',
    }}
  />
);

// Example 7: Empty state with single action only
const SingleActionExample = () => (
  <EmptyState
    icon={Box}
    title="No data available"
    description="There's nothing to display right now."
    variant="info"
    primaryAction={{
      label: 'Refresh',
      onClick: () => console.log('Refresh clicked'),
      variant: 'primary',
    }}
  />
);

// Example 8: Empty state without icon
const NoIconExample = () => (
  <EmptyState
    title="Coming Soon"
    description="This feature is currently under development and will be available in the next release."
    variant="info"
  />
);

export default function EmptyStateExamples() {
  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold mb-4">EmptyState Component Examples</h1>

      <section>
        <h2 className="text-xl font-semibold mb-4">1. Basic EmptyState</h2>
        <BasicExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">2. No Items Found (with search)</h2>
        <SearchEmptyExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">3. No Items Found (empty list)</h2>
        <EmptyListExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">4. First-Time Setup</h2>
        <FirstTimeSetupExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">5. Error State</h2>
        <ErrorExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">6. Warning State</h2>
        <WarningExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">7. Single Action</h2>
        <SingleActionExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">8. No Icon</h2>
        <NoIconExample />
      </section>
    </div>
  );
}
