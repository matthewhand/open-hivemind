import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import all DaisyUI components to test they can be loaded
import {
  Accordion,
  Badge,
  Breadcrumbs,
  Carousel,
  Chat,
  DataTable,
  Loading,
  Modal,
  ModalForm,
  StatsCards,
  StepWizard,
  Timeline,
  ToastNotification,
  VisualFeedback,
  DrawerNavigation,
  MobileDrawer,
  NavbarWithSearch,
  HamburgerMenu,
  Drawer,
  FileUpload,
  Dropdown,
  RangeSlider,
  Kbd,
  Tooltip,
  ProgressBar,
  Countdown,
  Mockup,
  AdvancedThemeSwitcher,
  DashboardWidgetSystem,
  SettingsPage
} from '../components/DaisyUI';

describe('DaisyUI Components', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  // Test that all components can be imported without throwing errors
  test('all components can be imported', () => {
    expect(Accordion).toBeDefined();
    expect(Badge).toBeDefined();
    expect(Breadcrumbs).toBeDefined();
    expect(Carousel).toBeDefined();
    expect(Chat).toBeDefined();
    expect(DataTable).toBeDefined();
    expect(Loading).toBeDefined();
    expect(Modal).toBeDefined();
    expect(ModalForm).toBeDefined();
    expect(StatsCards).toBeDefined();
    expect(StepWizard).toBeDefined();
    expect(Timeline).toBeDefined();
    expect(ToastNotification).toBeDefined();
    expect(VisualFeedback).toBeDefined();
    expect(DrawerNavigation).toBeDefined();
    expect(MobileDrawer).toBeDefined();
    expect(NavbarWithSearch).toBeDefined();
    expect(HamburgerMenu).toBeDefined();
    expect(Drawer).toBeDefined();
    expect(FileUpload).toBeDefined();
    expect(Dropdown).toBeDefined();
    expect(RangeSlider).toBeDefined();
    expect(Kbd).toBeDefined();
    expect(Tooltip).toBeDefined();
    expect(ProgressBar).toBeDefined();
    expect(Countdown).toBeDefined();
    expect(Mockup).toBeDefined();
    expect(AdvancedThemeSwitcher).toBeDefined();
    expect(DashboardWidgetSystem).toBeDefined();
    expect(SettingsPage).toBeDefined();
  });

  // Test basic component rendering
  test('Badge component renders correctly', () => {
    renderWithRouter(<Badge variant="primary">Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  test('Loading component renders correctly', () => {
    renderWithRouter(<Loading.LoadingSpinner variant="spinner" size="md" />);
    // Check if loading element is present
    expect(document.querySelector('.loading')).toBeInTheDocument();
  });

  test('ProgressBar component renders correctly', () => {
    renderWithRouter(
      <ProgressBar 
        label="Test Progress" 
        value={50} 
        max={100} 
        showPercentage={true}
      />
    );
    expect(screen.getByText('Test Progress')).toBeInTheDocument();
  });

  test('StatsCards component renders correctly', () => {
    const stats = [
      { id: '1', title: 'Test Stat', value: '100', icon: '📊', description: '+10%' }
    ];
    renderWithRouter(<StatsCards stats={stats} />);
    expect(screen.getByText('Test Stat')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('DataTable component renders correctly', () => {
    const data = [
      { id: 1, name: 'Test Item', status: 'active' }
    ];
    const columns = [
      { key: 'name' as const, title: 'Name' },
      { key: 'status' as const, title: 'Status' }
    ];
    renderWithRouter(<DataTable data={data} columns={columns} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  test('Timeline component renders correctly', () => {
    const events = [
      {
        id: '1',
        title: 'Test Event',
        description: 'Test Description',
        timestamp: new Date(),
        type: 'success' as const
      }
    ];
    renderWithRouter(<Timeline events={events} />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  test('Accordion component renders correctly', () => {
    const items = [
      { id: '1', title: 'Test Item', content: 'Test Content' }
    ];
    renderWithRouter(<Accordion items={items} />);
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  test('Breadcrumbs component renders correctly', () => {
    const items = [
      { label: 'Test', href: '/test' }
    ];
    renderWithRouter(<Breadcrumbs items={items} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('Kbd component renders correctly', () => {
    renderWithRouter(<Kbd><span>cmd</span><span>k</span></Kbd>);
    // Check if keyboard shortcut elements are present
    expect(document.querySelector('.kbd')).toBeInTheDocument();
  });

  test('Tooltip component renders correctly', () => {
    renderWithRouter(
      <Tooltip content="Test tooltip" position="top">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  test('Modal component can be rendered', () => {
    renderWithRouter(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  test('VisualFeedback component renders correctly', () => {
    const metrics = [{ name: 'CPU', value: 50, unit: '%' }];
    renderWithRouter(
      <VisualFeedback
        metrics={metrics}
      />
    );
    expect(screen.getByText('System Health & Feedback')).toBeInTheDocument();
  });

  test('Dropdown component renders correctly', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ];
    renderWithRouter(
      <Dropdown
        trigger={<span>Test Dropdown</span>}
      >
        {options.map(o => <li key={o.value}><a>{o.label}</a></li>)}
      </Dropdown>
    );
    expect(screen.getByText('Test Dropdown')).toBeInTheDocument();
  });

  test('RangeSlider component renders correctly', () => {
    renderWithRouter(
      <RangeSlider 
        label="Test Slider"
        min={0}
        max={100}
        value={50}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Test Slider')).toBeInTheDocument();
  });

  test('Countdown component renders correctly', () => {
    const targetDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
    renderWithRouter(
      <Countdown 
        targetDate={targetDate}
        onComplete={() => {}}
      />
    );
    // Check if countdown elements are present
    expect(document.querySelector('.countdown')).toBeInTheDocument();
  });
});