import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Form, FormField, FormFieldSet } from './Form';

const mockSubmit = jest.fn();
const mockCancel = jest.fn();

const basicFields: FormField[] = [
  {
    name: 'username',
    label: 'Username',
    type: 'text',
    required: true,
    placeholder: 'Enter username',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'Enter email',
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    required: true,
    minLength: 6,
  },
];

const advancedFields: FormField[] = [
  ...basicFields,
  {
    name: 'bio',
    label: 'Biography',
    type: 'textarea',
    placeholder: 'Tell us about yourself',
    maxLength: 500,
  },
  {
    name: 'country',
    label: 'Country',
    type: 'select',
    options: [
      { value: 'us', label: 'United States' },
      { value: 'ca', label: 'Canada' },
      { value: 'uk', label: 'United Kingdom' },
    ],
  },
  {
    name: 'newsletter',
    label: 'Subscribe to newsletter',
    type: 'checkbox',
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'radio',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    name: 'avatar',
    label: 'Avatar',
    type: 'file',
    accept: 'image/*',
  },
  {
    name: 'website',
    label: 'Website',
    type: 'url',
    placeholder: 'https://example.com',
  },
  {
    name: 'age',
    label: 'Age',
    type: 'number',
    min: 18,
    max: 120,
  },
];

beforeEach(() => {
  mockSubmit.mockClear();
  mockCancel.mockClear();
});

describe('Form', () => {
  describe('Basic Rendering', () => {
    test('renders form with basic fields', () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    test('renders form title and description', () => {
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          title="User Registration"
          description="Please fill out the form below"
        />
      );
      
      expect(screen.getByText('User Registration')).toBeInTheDocument();
      expect(screen.getByText('Please fill out the form below')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          className="custom-form"
        />
      );
      
      expect(container.querySelector('form')).toHaveClass('custom-form');
    });

    test('renders with custom ID', () => {
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          id="registration-form"
        />
      );
      
      expect(screen.getByRole('form')).toHaveAttribute('id', 'registration-form');
    });
  });

  describe('Form Layouts', () => {
    test('renders vertical layout by default', () => {
      const { container } = render(
        <Form fields={basicFields} onSubmit={mockSubmit} />
      );
      
      // Vertical layout should not have horizontal grid classes
      expect(container.querySelector('.grid-cols-3')).not.toBeInTheDocument();
    });

    test('renders horizontal layout', () => {
      const { container } = render(
        <Form fields={basicFields} onSubmit={mockSubmit} layout="horizontal" />
      );
      
      // Horizontal layout should have grid classes (with responsive prefix)
      expect(container.querySelector('.md\\:grid-cols-3')).toBeInTheDocument();
    });
  });

  describe('Field Types', () => {
    test('renders text input field', () => {
      render(<Form fields={[basicFields[0]]} onSubmit={mockSubmit} />);
      
      const input = screen.getByLabelText(/username/i);
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('placeholder', 'Enter username');
    });

    test('renders email input field', () => {
      render(<Form fields={[basicFields[1]]} onSubmit={mockSubmit} />);
      
      const input = screen.getByLabelText(/email/i);
      expect(input).toHaveAttribute('type', 'email');
    });

    test('renders password input field', () => {
      render(<Form fields={[basicFields[2]]} onSubmit={mockSubmit} />);
      
      const input = screen.getByLabelText(/password/i);
      expect(input).toHaveAttribute('type', 'password');
    });

    test('renders textarea field', () => {
      const field = advancedFields.find(f => f.type === 'textarea')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      const textarea = screen.getByLabelText(/biography/i);
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea).toHaveAttribute('maxlength', '500');
    });

    test('renders select field', () => {
      const field = advancedFields.find(f => f.type === 'select')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      const select = screen.getByLabelText(/country/i);
      expect(select.tagName).toBe('SELECT');
      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('Canada')).toBeInTheDocument();
    });

    test('renders checkbox field', () => {
      const field = advancedFields.find(f => f.type === 'checkbox')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      const checkbox = screen.getByLabelText(/subscribe to newsletter/i);
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    test('renders radio field group', () => {
      const field = advancedFields.find(f => f.type === 'radio')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      expect(screen.getByLabelText('Male')).toBeInTheDocument();
      expect(screen.getByLabelText('Female')).toBeInTheDocument();
      expect(screen.getByLabelText('Other')).toBeInTheDocument();
    });

    test('renders file input field', () => {
      const field = advancedFields.find(f => f.type === 'file')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      const fileInput = screen.getByLabelText(/avatar/i);
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });

    test('renders url input field', () => {
      const field = advancedFields.find(f => f.type === 'url')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      const input = screen.getByLabelText(/website/i);
      expect(input).toHaveAttribute('type', 'url');
    });

    test('renders number input field with min/max', () => {
      const field = advancedFields.find(f => f.type === 'number')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      const input = screen.getByLabelText(/age/i);
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('min', '18');
      expect(input).toHaveAttribute('max', '120');
    });
  });

  describe('Required Fields', () => {
    test('shows required indicator for required fields', () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      const requiredIndicators = screen.getAllByText('*');
      expect(requiredIndicators).toHaveLength(3); // All basic fields are required
    });

    test('validates required fields on submit', async () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
      
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    test('validates email format', async () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    test('validates minimum length', async () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await userEvent.type(passwordInput, '123');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });

    test('validates number range', async () => {
      const field = advancedFields.find(f => f.type === 'number')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      const ageInput = screen.getByLabelText(/age/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await userEvent.type(ageInput, '15');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Value must be at least 18')).toBeInTheDocument();
      });
    });

    test('validates url format', async () => {
      const field = advancedFields.find(f => f.type === 'url')!;
      render(<Form fields={[field]} onSubmit={mockSubmit} />);
      
      const urlInput = screen.getByLabelText(/website/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await userEvent.type(urlInput, 'invalid-url');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
      });
    });

    test('custom validation function', async () => {
      const customField: FormField = {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
        validation: (value) => {
          if (value && value.length < 3) {
            return 'Username must be at least 3 characters';
          }
          return null;
        },
      };
      
      render(<Form fields={[customField]} onSubmit={mockSubmit} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await userEvent.type(usernameInput, 'ab');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Validation Modes', () => {
    test('validates on change when validateOnChange is true', async () => {
      render(
        <Form 
          fields={basicFields} 
          onSubmit={mockSubmit} 
          validateOnChange={true}
        />
      );
      
      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid');
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    test('validates on blur when validateOnBlur is true', async () => {
      render(
        <Form 
          fields={basicFields} 
          onSubmit={mockSubmit} 
          validateOnBlur={true}
        />
      );
      
      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid');
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });
  });

  describe('Helper Text', () => {
    test('displays helper text', () => {
      const fieldWithHelper: FormField = {
        name: 'username',
        label: 'Username',
        type: 'text',
        helperText: 'Choose a unique username',
      };
      
      render(<Form fields={[fieldWithHelper]} onSubmit={mockSubmit} />);
      
      expect(screen.getByText('Choose a unique username')).toBeInTheDocument();
    });

    test('hides helper text when error is shown', async () => {
      const fieldWithHelper: FormField = {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
        helperText: 'Choose a unique username',
      };
      
      render(<Form fields={[fieldWithHelper]} onSubmit={mockSubmit} />);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
        expect(screen.queryByText('Choose a unique username')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('submits form with valid data', async () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    test('shows loading state during submission', async () => {
      const slowSubmit = jest.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100)));
      render(<Form fields={basicFields} onSubmit={slowSubmit} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      
      fireEvent.click(submitButton);
      
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Submit').querySelector('.loading-spinner')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    test('prevents submission with invalid data', async () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
      });
      
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    test('disables form when loading prop is true', () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} loading={true} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      expect(usernameInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    test('shows loading spinner on submit button when loading', () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} loading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      expect(submitButton.querySelector('.loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    test('shows cancel button when showCancel is true', () => {
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          showCancel={true}
          onCancel={mockCancel}
        />
      );
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('calls onCancel when cancel button is clicked', () => {
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          showCancel={true}
          onCancel={mockCancel}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe('Field Sets', () => {
    test('renders field sets', () => {
      const fieldSets: FormFieldSet[] = [
        {
          legend: 'Personal Information',
          description: 'Basic personal details',
          fields: ['username', 'email'],
        },
        {
          legend: 'Security',
          fields: ['password'],
        },
      ];
      
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          fieldSets={fieldSets}
        />
      );
      
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByText('Basic personal details')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      
      // Check that fields are grouped correctly
      const personalFieldset = screen.getByText('Personal Information').closest('fieldset');
      const securityFieldset = screen.getByText('Security').closest('fieldset');
      
      expect(personalFieldset).toContainElement(screen.getByLabelText(/username/i));
      expect(personalFieldset).toContainElement(screen.getByLabelText(/email/i));
      expect(securityFieldset).toContainElement(screen.getByLabelText(/password/i));
    });
  });

  describe('Initial Data', () => {
    test('populates form with initial data', () => {
      const initialData = {
        username: 'initial_user',
        email: 'initial@example.com',
      };
      
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          initialData={initialData}
        />
      );
      
      expect(screen.getByDisplayValue('initial_user')).toBeInTheDocument();
      expect(screen.getByDisplayValue('initial@example.com')).toBeInTheDocument();
    });

    test('updates form when initialData changes', () => {
      const { rerender } = render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          initialData={{ username: 'first' }}
        />
      );
      
      expect(screen.getByDisplayValue('first')).toBeInTheDocument();
      
      rerender(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          initialData={{ username: 'second' }}
        />
      );
      
      expect(screen.getByDisplayValue('second')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          aria-label="Registration form"
        />
      );
      
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Registration form');
    });

    test('associates labels with inputs', () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(usernameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });

    test('associates error messages with inputs', async () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} />);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const usernameInput = screen.getByLabelText(/username/i);
        const errorMessage = screen.getByText('Username is required');
        
        expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
        expect(usernameInput.getAttribute('aria-describedby')).toContain(errorMessage.id);
      });
    });

    test('associates helper text with inputs', () => {
      const fieldWithHelper: FormField = {
        name: 'username',
        label: 'Username',
        type: 'text',
        helperText: 'Choose a unique username',
      };
      
      render(<Form fields={[fieldWithHelper]} onSubmit={mockSubmit} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const helperText = screen.getByText('Choose a unique username');
      
      expect(usernameInput.getAttribute('aria-describedby')).toContain(helperText.id);
    });

    test('supports auto focus', () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} autoFocus={true} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveFocus();
    });
  });

  describe('Form Sizes', () => {
    test('applies size classes', () => {
      render(<Form fields={basicFields} onSubmit={mockSubmit} size="lg" />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveClass('form-control-lg');
    });
  });

  describe('Disabled and Readonly States', () => {
    test('disables specific fields', () => {
      const disabledField: FormField = {
        name: 'username',
        label: 'Username',
        type: 'text',
        disabled: true,
      };
      
      render(<Form fields={[disabledField]} onSubmit={mockSubmit} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toBeDisabled();
    });

    test('makes specific fields readonly', () => {
      const readonlyField: FormField = {
        name: 'username',
        label: 'Username',
        type: 'text',
        readonly: true,
      };
      
      render(<Form fields={[readonlyField]} onSubmit={mockSubmit} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveAttribute('readonly');
    });
  });

  describe('Custom Buttons', () => {
    test('renders custom submit button', () => {
      const customSubmitButton = (
        <button type="submit" className="btn btn-success">
          Custom Submit
        </button>
      );
      
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          submitButton={customSubmitButton}
        />
      );
      
      expect(screen.getByRole('button', { name: /custom submit/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
    });

    test('renders custom cancel button', () => {
      const customCancelButton = (
        <button type="button" className="btn btn-warning">
          Custom Cancel
        </button>
      );
      
      render(
        <Form
          fields={basicFields}
          onSubmit={mockSubmit}
          showCancel={true}
          cancelButton={customCancelButton}
        />
      );
      
      expect(screen.getByRole('button', { name: /custom cancel/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();
    });
  });
});