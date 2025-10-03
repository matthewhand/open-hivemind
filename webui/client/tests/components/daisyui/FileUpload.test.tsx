import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import FileUpload from '@/components/DaisyUI/FileUpload';

describe('FileUpload Component', () => {
  it('renders without crashing', () => {
    render(<FileUpload />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays upload area', () => {
    render(<FileUpload />);
    
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to select/i)).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<FileUpload className="custom-upload" />);
    
    const upload = screen.getByRole('button');
    expect(upload).toHaveClass('custom-upload');
  });

  it('handles file selection', () => {
    const mockOnFileSelect = jest.fn();
    render(<FileUpload onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button').querySelector('input[type="file"]');
    
    fireEvent.change(input!, { target: { files: [file] } });
    
    expect(mockOnFileSelect).toHaveBeenCalledWith([file]);
  });

  it('handles drag and drop', () => {
    const mockOnFileSelect = jest.fn();
    render(<FileUpload onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const dropZone = screen.getByRole('button');
    
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file]
      }
    });
    
    expect(mockOnFileSelect).toHaveBeenCalledWith([file]);
  });

  it('shows file list when files are selected', () => {
    const files = [
      new File(['test1'], 'test1.txt', { type: 'text/plain' }),
      new File(['test2'], 'test2.txt', { type: 'text/plain' })
    ];
    
    render(<FileUpload files={files} />);
    
    expect(screen.getByText('test1.txt')).toBeInTheDocument();
    expect(screen.getByText('test2.txt')).toBeInTheDocument();
  });

  it('handles file removal', () => {
    const files = [new File(['test'], 'test.txt', { type: 'text/plain' })];
    const mockOnFileRemove = jest.fn();
    
    render(<FileUpload files={files} onFileRemove={mockOnFileRemove} />);
    
    const removeButton = screen.getByLabelText(/remove file/i);
    fireEvent.click(removeButton);
    
    expect(mockOnFileRemove).toHaveBeenCalledWith(0);
  });

  it('supports multiple file upload', () => {
    render(<FileUpload multiple />);
    
    const input = screen.getByRole('button').querySelector('input[type="file"]');
    expect(input).toHaveAttribute('multiple');
  });

  it('shows upload progress', () => {
    const files = [new File(['test'], 'test.txt', { type: 'text/plain' })];
    render(<FileUpload files={files} uploadProgress={50} />);
    
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<FileUpload />);
    
    const upload = screen.getByRole('button');
    expect(upload).toHaveAttribute('aria-label', 'File upload');
  });

  it('accepts specific file types', () => {
    render(<FileUpload accept=".jpg,.png" />);
    
    const input = screen.getByRole('button').querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', '.jpg,.png');
  });
});