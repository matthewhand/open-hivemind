import React, { useState } from 'react';
import { Button, Input } from '../DaisyUI';

interface CreateBotFormProps {
  onSubmit: (name: string, description?: string) => void;
  onCancel: () => void;
}

const CreateBotForm: React.FC<CreateBotFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      onSubmit(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Failed to create bot:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Bot Name</span>
          <span className="label-text-alt text-error">*</span>
        </label>
        <Input
          type="text"
          placeholder="Enter a name for your bot"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-bordered"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Description (Optional)</span>
        </label>
        <textarea
          className="textarea textarea-bordered"
          placeholder="Describe what this bot does..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!name.trim() || isSubmitting}
          className="min-w-[100px]"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              Creating...
            </>
          ) : (
            'Create Bot'
          )}
        </Button>
      </div>
    </form>
  );
};

export default CreateBotForm;