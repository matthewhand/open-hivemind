/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { createContext, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
  EyeIcon,
  NoSymbolIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export interface SecurityConfig {
  csrfProtection: {
    enabled: boolean;
    tokenRotationInterval: number; // minutes
    allowedOrigins: string[];
    sameSitePolicy: 'strict' | 'lax' | 'none';
  };
  xssPrevention: {
    enabled: boolean;
    inputSanitization: boolean;
    outputEncoding: boolean;
    cspEnabled: boolean;
    cspPolicy: string;
    trustedTypes: boolean;
  };
  headers: {
    hstsEnabled: boolean;
    hstsMaxAge: number;
    xFrameOptions: 'deny' | 'sameorigin' | 'allow-from';
    xContentTypeOptions: boolean;
    xXSSProtection: boolean;
    referrerPolicy: string;
    permissionsPolicy: string;
  };
  rateLimiting: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  authentication: {
    sessionTimeout: number; // minutes
    maxLoginAttempts: number;
    lockoutDuration: number; // minutes
    requireMFA: boolean;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      maxAge: number; // days
      preventReuse: number;
    };
  };
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm: string;
    keyRotationInterval: number; // days
  };
  monitoring: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    alertThresholds: {
      failedLogins: number;
      suspiciousActivity: number;
      dataAccess: number;
    };
    realTimeMonitoring: boolean;
    anomalyDetection: boolean;
  };
}

export interface SecurityIncident {
  id: string;
  timestamp: Date;
  type: 'xss_attempt' | 'csrf_attempt' | 'rate_limit_exceeded' | 'suspicious_login' | 'data_breach' | 'malware_detected' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  description: string;
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
    location?: string;
  };
  target: {
    resource: string;
    action: string;
    data?: string;
  };
  impact: {
    affectedUsers?: number;
    dataExposed?: boolean;
    systemCompromised?: boolean;
  };
  response: {
    actionsTaken: string[];
    containmentMeasures: string[];
    resolution: string;
    lessonsLearned: string;
  };
  assignedTo?: string;
  createdBy: string;
  updatedAt: Date;
}

export interface SecurityScan {
  id: string;
  name: string;
  type: 'vulnerability' | 'compliance' | 'penetration' | 'code_review';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  findings: SecurityFinding[];
  startedAt?: Date;
  completedAt?: Date;
  scheduledAt?: Date;
  config: Record<string, unknown>;
}

export interface SecurityFinding {
  id: string;
  scanId: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  remediation: string;
  affectedResources: string[];
  cve?: string;
  cvss?: number;
  compliance?: string[];
  falsePositive: boolean;
  verified: boolean;
  status: 'open' | 'resolved' | 'accepted' | 'false_positive';
}

export interface SecurityMetrics {
  overallScore: number;
  incidents: {
    total: number;
    activeIncidents: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    last24h: number;
    last7d: number;
    last30d: number;
  };
  scans: {
    total: number;
    completed: number;
    failed: number;
    findings: number;
    averageDuration: number;
  };
  compliance: {
    score: number;
    frameworks: Array<{
      name: string;
      score: number;
      requirements: number;
      compliant: number;
      nonCompliant: number;
    }>;
  };
  threats: {
    blocked: number;
    detected: number;
    mitigated: number;
    topThreats: Array<{ name: string; count: number }>;
  };
}

interface SecurityContextType {
  config: SecurityConfig;
  isLoading: boolean;
  lastUpdated: Date;
  incidents: SecurityIncident[];
  activeIncidents: SecurityIncident[];
  recentIncidents: SecurityIncident[];
  scans: SecurityScan[];
  activeScans: SecurityScan[];
  recentFindings: SecurityFinding[];
  metrics: SecurityMetrics;
  updateConfig: (updates: Partial<SecurityConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
  exportConfig: () => string;
  importConfig: (config: string) => Promise<void>;
  createIncident: (incident: Omit<SecurityIncident, 'id' | 'timestamp' | 'createdBy' | 'updatedAt'>) => Promise<SecurityIncident>;
  updateIncident: (id: string, updates: Partial<SecurityIncident>) => Promise<void>;
  resolveIncident: (id: string, resolution: string) => Promise<void>;
  assignIncident: (id: string, userId: string) => Promise<void>;
  startScan: (scan: Omit<SecurityScan, 'id' | 'status' | 'progress' | 'findings' | 'startedAt' | 'completedAt'>) => Promise<SecurityScan>;
  cancelScan: (id: string) => Promise<void>;
  scheduleScan: (scan: Omit<SecurityScan, 'id' | 'status' | 'progress' | 'findings' | 'startedAt' | 'completedAt'>, scheduleAt: Date) => Promise<SecurityScan>;
  markFindingAsFalsePositive: (id: string) => Promise<void>;
  verifyFinding: (id: string) => Promise<void>;
  remediateFinding: (id: string) => Promise<void>;
  enableRealTimeMonitoring: () => Promise<void>;
  disableRealTimeMonitoring: () => Promise<void>;
  getThreats: () => SecurityIncident[];
  blockIP: (ip: string, reason: string) => Promise<void>;
  unblockIP: (ip: string) => Promise<void>;
  runComplianceCheck: (framework: string) => Promise<SecurityScan>;
  getComplianceReport: (framework: string) => Promise<string>;
  getSeverityColor: (severity: string) => string;
  getStatusColor: (status: string) => string;
  getIncidentIcon: (type: string) => React.ReactNode;
  getScanIcon: (type: string) => React.ReactNode;
  formatDuration: (ms: number) => string;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const defaultSecurityConfig: SecurityConfig = {
  csrfProtection: {
    enabled: true,
    tokenRotationInterval: 15,
    allowedOrigins: [],
    sameSitePolicy: 'strict',
  },
  xssPrevention: {
    enabled: true,
    inputSanitization: true,
    outputEncoding: true,
    cspEnabled: true,
    cspPolicy: 'default-src \'self\'',
    trustedTypes: true,
  },
  headers: {
    hstsEnabled: true,
    hstsMaxAge: 31536000,
    xFrameOptions: 'deny',
    xContentTypeOptions: true,
    xXSSProtection: true,
    referrerPolicy: 'strict-origin',
    permissionsPolicy: '',
  },
  rateLimiting: {
    enabled: true,
    maxRequests: 100,
    windowMs: 900000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  authentication: {
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    requireMFA: false,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90,
      preventReuse: 5,
    },
  },
  encryption: {
    atRest: true,
    inTransit: true,
    algorithm: 'AES-256-GCM',
    keyRotationInterval: 90,
  },
  monitoring: {
    enabled: true,
    logLevel: 'info',
    alertThresholds: {
      failedLogins: 10,
      suspiciousActivity: 5,
      dataAccess: 100,
    },
    realTimeMonitoring: true,
    anomalyDetection: true,
  },
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);

  const [config, setConfig] = useState<SecurityConfig>(defaultSecurityConfig);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [isLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const metrics: SecurityMetrics = {
    overallScore: 100,
    incidents: {
      total: 0,
      activeIncidents: 0,
      bySeverity: {},
      byStatus: {},
      byType: {},
      last24h: 0,
      last7d: 0,
      last30d: 0,
    },
    scans: {
      total: 0,
      completed: 0,
      failed: 0,
      findings: 0,
      averageDuration: 0,
    },
    compliance: {
      score: 100,
      frameworks: [],
    },
    threats: {
      blocked: 0,
      detected: 0,
      mitigated: 0,
      topThreats: [],
    },
  };

  const updateConfig = async (updates: Partial<SecurityConfig>) => { setConfig(prev => ({ ...prev, ...updates })); setLastUpdated(new Date()); };
  const resetConfig = async () => { setConfig(defaultSecurityConfig); setLastUpdated(new Date()); };
  const exportConfig = () => JSON.stringify(config, null, 2);
  const importConfig = async (str: string) => { setConfig(JSON.parse(str)); setLastUpdated(new Date()); };

  const createIncident = async (data: any) => {
    const inc: SecurityIncident = { ...data, id: `inc-${Date.now()}`, timestamp: new Date(), createdBy: currentUser?.username || 'system', updatedAt: new Date() };
    setIncidents(prev => [inc, ...prev]);
    return inc;
  };
  const updateIncident = async (id: string, updates: any) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };
  const resolveIncident = async (id: string, res: string) => { updateIncident(id, { status: 'resolved' }); };
  const assignIncident = async (id: string, userId: string) => { updateIncident(id, { assignedTo: userId }); };

  const startScan = async (data: any) => {
    const scan: SecurityScan = { ...data, id: `scan-${Date.now()}`, status: 'running', progress: 0, findings: [], startedAt: new Date() };
    setScans(prev => [scan, ...prev]);
    return scan;
  };
  const cancelScan = async (id: string) => { setScans(prev => prev.map(s => s.id === id ? { ...s, status: 'failed' } : s)); };
  const scheduleScan = async (data: any, date: Date) => { return startScan(data); }; // simplified

  const markFindingAsFalsePositive = async (id: string) => { };
  const verifyFinding = async (id: string) => { };
  const remediateFinding = async (id: string) => { };

  const enableRealTimeMonitoring = async () => { };
  const disableRealTimeMonitoring = async () => { };
  const getThreats = () => [];
  const blockIP = async (ip: string, reason: string) => { };
  const unblockIP = async (ip: string) => { };
  const runComplianceCheck = async (framework: string) => { return startScan({ name: framework, type: 'compliance' }); };
  const getComplianceReport = async (framework: string) => '{}';

  const getSeverityColor = (s: string) => 'info';
  const getStatusColor = (s: string) => 'info';
  const getIncidentIcon = (t: string) => <ShieldCheckIcon className="w-5 h-5" />;
  const getScanIcon = (t: string) => <ShieldCheckIcon className="w-5 h-5" />;
  const formatDuration = (ms: number) => `${ms}ms`;

  const contextValue: SecurityContextType = {
    config,
    isLoading,
    lastUpdated,
    incidents,
    activeIncidents: incidents,
    recentIncidents: incidents,
    scans,
    activeScans: scans,
    recentFindings: [],
    metrics,
    updateConfig,
    resetConfig,
    exportConfig,
    importConfig,
    createIncident,
    updateIncident,
    resolveIncident,
    assignIncident,
    startScan,
    cancelScan,
    scheduleScan,
    markFindingAsFalsePositive,
    verifyFinding,
    remediateFinding,
    enableRealTimeMonitoring,
    disableRealTimeMonitoring,
    getThreats,
    blockIP,
    unblockIP,
    runComplianceCheck,
    getComplianceReport,
    getSeverityColor,
    getStatusColor,
    getIncidentIcon,
    getScanIcon,
    formatDuration,
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

export default SecurityProvider;
export { SecurityContext };