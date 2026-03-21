import { render, screen, fireEvent } from '@testing-library/react';
import { CommaSeparatedInput } from '../../src/client/src/components/Common/CommaSeparatedInput';

describe('CommaSeparatedInput', () => {
  it('should auto-append space after comma', () => {
    const handleChange = jest.fn();
    render(<CommaSeparatedInput value={[]} onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test,' } });
    
    expect(input).toHaveValue('test, ');
  });

  it('should not append space on backspace', () => {
    const handleChange = jest.fn();
    render(<CommaSeparatedInput value={[]} onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test, ' } });
    fireEvent.change(input, { target: { value: 'test,' } });
    
    expect(input).toHaveValue('test,');
  });

  it('should validate input with validate prop', () => {
    const handleChange = jest.fn();
    const validate = (v: string) => /^[a-zA-Z0-9_-]+$/.test(v) ? null : 'Invalid character';
    render(<CommaSeparatedInput value={[]} onChange={handleChange} validate={validate} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@invalid' } });
    
    expect(screen.getByText('Invalid character')).toBeInTheDocument();
  });
});
