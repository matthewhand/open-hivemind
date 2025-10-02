import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Select, { SelectOption, SelectOptionGroup } from './Select';

// Mock options for testing
const mockOptions: SelectOption[] = [
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
  { label: 'Disabled Option', value: 'disabled', disabled: true },
];

const mockOptionGroups: SelectOptionGroup[] = [
  {
    label: 'Group 1',
    options: [
      { label: 'Group 1 Option 1', value: 'g1o1' },
      { label: 'Group 1 Option 2', value: 'g1o2' },
    ],
  },
  {
    label: 'Group 2',
    options: [
      { label: 'Group 2 Option 1', value: 'g2o1' },
      { label: 'Group 2 Option 2', value: 'g2o2' },
    ],
  },
];

describe('Select Component', () => {
  describe('Basic Rendering', () => {
    it('renders a select element', () => {
      render(<Select options={mockOptions} />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toBeInTheDocument();
    });

    it('renders with default classes', () => {
      render(<Select options={mockOptions} />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveClass('select', 'w-full');
    });

    it('renders options correctly', () => {
      render(<Select options={mockOptions} />);
      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Disabled Option' })).toBeInTheDocument();
    });

    it('renders children when provided', () => {
      render(
        <Select>
          <option value="child1">Child Option 1</option>
          <option value="child2">Child Option 2</option>
        </Select>
      );
      expect(screen.getByRole('option', { name: 'Child Option 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Child Option 2' })).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it.each(['xs', 'sm', 'md', 'lg'] as const)('applies size class for %s', (size) => {
      render(<Select options={mockOptions} size={size} />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveClass(`select-${size}`);
    });
  });

  describe('Color Variants', () => {
    it.each(['primary', 'secondary', 'accent', 'ghost'] as const)(
      'applies variant class for %s',
      (variant) => {
        render(<Select options={mockOptions} variant={variant} />);
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toHaveClass(`select-${variant}`);
      }
    );
  });

  describe('State Variations', () => {
    it('applies error styling when error prop is true', () => {
      render(<Select options={mockOptions} error />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveClass('select-error');
    });

    it('applies success styling when success prop is true', () => {
      render(<Select options={mockOptions} success />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveClass('select-success');
    });

    it('applies disabled styling when disabled prop is true', () => {
      render(<Select options={mockOptions} disabled />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveClass('cursor-not-allowed', 'opacity-60');
      expect(selectElement).toBeDisabled();
    });

    it('shows loading state with spinner', () => {
      const { container } = render(<Select options={mockOptions} loading />);
      const selectElement = screen.getByRole('combobox');
      const spinner = container.querySelector('.loading-spinner');
      
      expect(selectElement).toHaveClass('animate-pulse');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Option Groups', () => {
    it('renders option groups correctly', () => {
      render(<Select optionGroups={mockOptionGroups} />);
      
      expect(screen.getByRole('group', { name: 'Group 1' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Group 2' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Group 1 Option 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Group 2 Option 1' })).toBeInTheDocument();
    });

    it('renders both individual options and option groups', () => {
      render(<Select options={mockOptions} optionGroups={mockOptionGroups} />);
      
      // Individual options
      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
      
      // Grouped options
      expect(screen.getByRole('group', { name: 'Group 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Group 1 Option 1' })).toBeInTheDocument();
    });
  });

  describe('Custom Option Rendering', () => {
    it('uses custom renderOption function when provided', () => {
      const customRenderOption = (option: SelectOption) => (
        <option key={option.value} value={option.value} data-testid={`custom-${option.value}`}>
          Custom: {option.label}
        </option>
      );

      render(<Select options={mockOptions} renderOption={customRenderOption} />);
      
      expect(screen.getByTestId('custom-option1')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Custom: Option 1' })).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('calls onChange when value changes', () => {
      const handleChange = jest.fn();
      render(<Select options={mockOptions} onChange={handleChange} />);
      
      const selectElement = screen.getByRole('combobox');
      fireEvent.change(selectElement, { target: { value: 'option2' } });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('calls onFocus when focused', () => {
      const handleFocus = jest.fn();
      render(<Select options={mockOptions} onFocus={handleFocus} />);
      
      const selectElement = screen.getByRole('combobox');
      fireEvent.focus(selectElement);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when blurred', () => {
      const handleBlur = jest.fn();
      render(<Select options={mockOptions} onBlur={handleBlur} />);
      
      const selectElement = screen.getByRole('combobox');
      fireEvent.focus(selectElement);
      fireEvent.blur(selectElement);
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Select options={mockOptions} aria-label="Test Select" />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveAttribute('aria-label', 'Test Select');
    });

    it('supports aria-describedby', () => {
      render(<Select options={mockOptions} aria-describedby="help-text" />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('supports aria-invalid for error state', () => {
      render(<Select options={mockOptions} aria-invalid="true" error />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveAttribute('aria-invalid', 'true');
    });

    it('handles disabled options correctly', () => {
      render(<Select options={mockOptions} />);
      const disabledOption = screen.getByRole('option', { name: 'Disabled Option' });
      expect(disabledOption).toBeDisabled();
    });
  });

  describe('Multiple Selection', () => {
    it('supports multiple selection', () => {
      render(<Select options={mockOptions} multiple />);
      const selectElement = screen.getByRole('listbox');
      expect(selectElement).toHaveAttribute('multiple');
    });

    it('allows multiple options to be selected', () => {
      const handleChange = jest.fn();
      render(<Select options={mockOptions} multiple onChange={handleChange} />);
      
      const selectElement = screen.getByRole('listbox');
      
      // Simulate selecting multiple options by changing the select value
      fireEvent.change(selectElement, {
        target: { value: 'option1' }
      });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Customization', () => {
    it('applies custom className', () => {
      render(<Select options={mockOptions} className="custom-class" />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveClass('custom-class');
    });

    it('forwards other HTML attributes', () => {
      render(<Select options={mockOptions} data-testid="custom-select" id="select-id" />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveAttribute('data-testid', 'custom-select');
      expect(selectElement).toHaveAttribute('id', 'select-id');
    });

    it('supports defaultValue', () => {
      render(<Select options={mockOptions} defaultValue="option2" />);
      const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
      expect(selectElement.value).toBe('option2');
    });

    it('supports controlled value', () => {
      const { rerender } = render(<Select options={mockOptions} value="option1" onChange={() => {}} />);
      const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
      expect(selectElement.value).toBe('option1');
      
      rerender(<Select options={mockOptions} value="option2" onChange={() => {}} />);
      expect(selectElement.value).toBe('option2');
    });
  });

  describe('Edge Cases', () => {
    it('renders without options', () => {
      render(<Select />);
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toBeInTheDocument();
    });

    it('handles empty option groups', () => {
      const emptyGroups: SelectOptionGroup[] = [
        { label: 'Empty Group', options: [] },
      ];
      render(<Select optionGroups={emptyGroups} />);
      expect(screen.getByRole('group', { name: 'Empty Group' })).toBeInTheDocument();
    });

    it('combines all state classes correctly', () => {
      render(
        <Select
          options={mockOptions}
          size="lg"
          variant="primary"
          error
          loading
          disabled
          className="custom"
        />
      );
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toHaveClass(
        'select',
        'w-full',
        'select-lg',
        'select-primary',
        'select-error',
        'animate-pulse',
        'cursor-not-allowed',
        'opacity-60',
        'custom'
      );
    });
  });

  describe('Forward Ref', () => {
    it('forwards ref to select element', () => {
      const ref = React.createRef<HTMLSelectElement>();
      render(<Select options={mockOptions} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });

    it('allows calling focus on ref', () => {
      const ref = React.createRef<HTMLSelectElement>();
      render(<Select options={mockOptions} ref={ref} />);
      
      const focusSpy = jest.spyOn(ref.current!, 'focus');
      ref.current!.focus();
      
      expect(focusSpy).toHaveBeenCalled();
    });
  });
});