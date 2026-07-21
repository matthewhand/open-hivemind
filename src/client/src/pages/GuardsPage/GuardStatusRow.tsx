import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '../../components/DaisyUI/Badge';
import { guardChipVariant } from '../guardSettings';

export const GuardStatusRow: React.FC<{ icon: React.ReactNode; label: string; enabled: boolean; detail: string; level?: string }> = ({ icon, label, enabled, detail, level }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="flex items-center gap-2 text-sm font-medium">
      {icon} {label}
    </span>
    <div className="flex items-center gap-2 shrink-0">
      {enabled ? (
        <CheckCircle className="w-4 h-4 text-success" />
      ) : (
        <XCircle className="w-4 h-4 text-base-content/30" />
      )}
      <Badge variant={guardChipVariant(enabled, level)} size="sm">{detail}</Badge>
    </div>
  </div>
);
