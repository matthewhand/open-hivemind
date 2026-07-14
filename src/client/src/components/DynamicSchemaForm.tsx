import React from 'react';
import type { ProviderSchema, ProviderField } from '../hooks/useAvailableProviderTypes';

interface Props {
  schema: ProviderSchema;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
  inputId,
}: {
  field: ProviderField;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  inputId: string;
}) {
  if (field.type === 'boolean') {
    return (
      <input
        id={inputId}
        type="checkbox"
        className="checkbox checkbox-primary checkbox-sm"
        checked={value === 'true'}
        onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
        disabled={disabled}
      />
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <select
        id={inputId}
        className="select select-bordered select-sm w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={inputId}
      type={
        field.type === 'password'
          ? 'password'
          : field.type === 'number'
            ? 'number'
            : 'text'
      }
      className="input input-bordered input-sm w-full"
      value={value}
      placeholder={field.default ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function FieldRow({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ProviderField;
  value: string;
  onChange: (name: string, v: string) => void;
  disabled?: boolean;
}) {
  const reactId = React.useId();
  const inputId = `field-${field.name}-${reactId}`;
  return (
    <div className="form-control w-full mb-2">
      <label className="label py-0.5" htmlFor={inputId}>
        <span className="label-text font-medium">{field.label}</span>
      </label>
      <FieldInput
        field={field}
        value={value}
        onChange={(v) => onChange(field.name, v)}
        disabled={disabled}
        inputId={inputId}
      />
      {field.description && (
        <label className="label py-0" htmlFor={inputId}>
          <span className="label-text-alt text-base-content/60">{field.description}</span>
        </label>
      )}
    </div>
  );
}

export function DynamicSchemaForm({ schema, values, onChange, disabled }: Props) {
  const hasRequired = schema.fields.required.length > 0;
  const hasOptional = schema.fields.optional.length > 0;
  const hasAdvanced = schema.fields.advanced.length > 0;

  return (
    <div className="space-y-4">
      {hasRequired && (
        <fieldset className="border border-base-200 rounded-lg p-4">
          <legend className="text-xs font-semibold text-error uppercase tracking-wide px-2 mb-1">
            Required
          </legend>
          <div className="space-y-1">
            {schema.fields.required.map((f) => (
              <FieldRow
                key={f.name}
                field={f}
                value={values[f.name] ?? ''}
                onChange={onChange}
                disabled={disabled}
              />
            ))}
          </div>
        </fieldset>
      )}

      {hasOptional && (
        <fieldset className="border border-base-200 rounded-lg p-4">
          <legend className="text-xs font-semibold text-base-content/70 uppercase tracking-wide px-2 mb-1">
            Optional
          </legend>
          <div className="space-y-1">
            {schema.fields.optional.map((f) => (
              <FieldRow
                key={f.name}
                field={f}
                value={values[f.name] ?? ''}
                onChange={onChange}
                disabled={disabled}
              />
            ))}
          </div>
        </fieldset>
      )}

      {hasAdvanced && (
        <details className="collapse collapse-arrow bg-base-200 mt-2 border border-base-300">
          <summary className="collapse-title text-sm font-medium py-2 min-h-0">
            Advanced Settings
          </summary>
          <div className="collapse-content">
            <fieldset className="p-2">
              <legend className="sr-only">Advanced Settings</legend>
              <div className="space-y-1">
                {schema.fields.advanced.map((f) => (
                  <FieldRow
                    key={f.name}
                    field={f}
                    value={values[f.name] ?? ''}
                    onChange={onChange}
                    disabled={disabled}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </details>
      )}
    </div>
  );
}
