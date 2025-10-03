import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import SettingsPage from '@/components/DaisyUI/SettingsPage';

describe('SettingsPage Component', () => {
  const mockSettings = [
    {
      category: 'General',
      items: [
        { key: 'theme', label: 'Theme', type: 'select', options: ['light', 'dark'] },
        { key: 'language', label: 'Language', type: 'select', options: ['en', 'es'] }
      ]
    },
    {
      category: 'Notifications',
      items: [
        { key: 'email', label: 'Email Notifications', type: 'toggle' },
        { key: 'push', label: 'Push Notifications', type: 'toggle' }
      ]
    }
  ];

  it('renders without crashing', () => {
    render(<SettingsPage settings={mockSettings} />);
    
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays all setting categories', () => {
    render(<SettingsPage settings={mockSettings} />);
    
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('displays all setting items', () => {
    render(<SettingsPage settings={mockSettings} />);
    
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
  });

  it('handles setting changes', () => {
    const mockOnChange = jest.fn();
    render(<SettingsPage settings={mockSettings} onChange={mockOnChange} />);
    
    const themeSelect = screen.getByLabelText('Theme');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('theme', 'dark');
  });

  it('applies correct CSS classes', () => {
    render(<SettingsPage settings={mockSettings} className="custom-settings" />);
    
    const settingsPage = screen.getByRole('main');
    expect(settingsPage).toHaveClass('custom-settings');
  });

  it('handles save button click', () => {
    const mockOnSave = jest.fn();
    render(<SettingsPage settings={mockSettings} onSave={mockOnSave} />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('handles reset button click', () => {
    const mockOnReset = jest.fn();
    render(<SettingsPage settings={mockSettings} onReset={mockOnReset} />);
    
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('is accessible', () => {
    render(<SettingsPage settings={mockSettings} />);
    
    const settingsPage = screen.getByRole('main');
    expect(settingsPage).toHaveAttribute('aria-label', 'Settings page');
  });

  it('handles empty settings array', () => {
    render(<SettingsPage settings={[]} />);
    
    expect(screen.getByText('No settings available')).toBeInTheDocument();
  });

  it('supports custom sections', () => {
    render(
      <SettingsPage settings={mockSettings}>
        <div>Custom Section</div>
      </SettingsPage>
    );
    
    expect(screen.getByText('Custom Section')).toBeInTheDocument();
  });
});