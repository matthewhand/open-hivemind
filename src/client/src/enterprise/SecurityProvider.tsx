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
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { AnimatedBox } from '../animations/AnimationComponents';

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
  // Configuration
  config: SecurityConfig;
  isLoading: boolean;
  lastUpdated: Date;

  // Security incidents
  incidents: SecurityIncident[];
  activeIncidents: SecurityIncident[];
  recentIncidents: SecurityIncident[];

  // Security scans
  scans: SecurityScan[];
  activeScans: SecurityScan[];
  recentFindings: SecurityFinding[];

  // Metrics
  metrics: SecurityMetrics;

  // Configuration management
  updateConfig: (updates: Partial<SecurityConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
  exportConfig: () => string;
  importConfig: (config: string) => Promise<void>;

  // Incident management
  createIncident: (incident: Omit<SecurityIncident, 'id' | 'timestamp' | 'createdBy' | 'updatedAt'>) => Promise<SecurityIncident>;
  updateIncident: (id: string, updates: Partial<SecurityIncident>) => Promise<void>;
  resolveIncident: (id: string, resolution: string) => Promise<void>;
  assignIncident: (id: string, userId: string) => Promise<void>;

  // Scan management
  startScan: (scan: Omit<SecurityScan, 'id' | 'status' | 'progress' | 'findings' | 'startedAt' | 'completedAt'>) => Promise<SecurityScan>;
  cancelScan: (id: string) => Promise<void>;
  scheduleScan: (scan: Omit<SecurityScan, 'id' | 'status' | 'progress' | 'findings' | 'startedAt' | 'completedAt'>, scheduleAt: Date) => Promise<SecurityScan>;

  // Finding management
  markFindingAsFalsePositive: (id: string) => Promise<void>;
  verifyFinding: (id: string) => Promise<void>;
  remediateFinding: (id: string) => Promise<void>;

  // Real-time monitoring
  enableRealTimeMonitoring: () => Promise<void>;
  disableRealTimeMonitoring: () => Promise<void>;

  // Threat detection
  getThreats: () => SecurityIncident[];
  blockIP: (ip: string, reason: string) => Promise<void>;
  unblockIP: (ip: string) => Promise<void>;

  // Compliance
  runComplianceCheck: (framework: string) => Promise<SecurityScan>;
  getComplianceReport: (framework: string) => Promise<string>;

  // UI helpers
  getSeverityColor: (severity: string) => string;
  getStatusColor: (status: string) => string;
  getIncidentIcon: (type: string) => React.ReactNode;
  getScanIcon: (type: string) => React.ReactNode;
  formatDuration: (ms: number) => string;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

// Default security configuration
const defaultSecurityConfig: SecurityConfig = {
  csrfProtection: {
    enabled: true,
    tokenRotationInterval: 15,
    allowedOrigins: ['https://open-hivemind.com', 'https://app.open-hivemind.com'],
    sameSitePolicy: 'strict',
  },
  xssPrevention: {
    enabled: true,
    inputSanitization: true,
    outputEncoding: true,
    cspEnabled: true,
    cspPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ws: wss:;",
    trustedTypes: true,
  },
  headers: {
    hstsEnabled: true,
    hstsMaxAge: 31536000, // 1 year
    xFrameOptions: 'deny',
    xContentTypeOptions: true,
    xXSSProtection: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
  },
  rateLimiting: {
    enabled: true,
    maxRequests: 100,
    windowMs: 900000, // 15 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  authentication: {
    sessionTimeout: 60, // 1 hour
    maxLoginAttempts: 5,
    lockoutDuration: 30, // 30 minutes
    requireMFA: false,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90, // 90 days
      preventReuse: 5,
    },
  },
  encryption: {
    atRest: true,
    inTransit: true,
    algorithm: 'AES-256-GCM',
    keyRotationInterval: 90, // 90 days
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

// Mock data for demonstration
const mockIncidents: SecurityIncident[] = [
  {
    id: 'incident-001',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    type: 'suspicious_login',
    severity: 'medium',
    status: 'investigating',
    description: 'Multiple failed login attempts detected from unusual location',
    source: {
      ip: '203.0.113.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      location: 'Moscow, Russia',
    },
    target: {
      resource: 'authentication',
      action: 'login',
    },
    impact: {
      affectedUsers: 1,
      dataExposed: false,
      systemCompromised: false,
    },
    response: {
      actionsTaken: ['IP temporarily blocked', 'User notified'],
      containmentMeasures: ['Account temporarily locked'],
      resolution: 'Under investigation',
      lessonsLearned: 'Implement geographic login restrictions',
    },
    createdBy: 'system',
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 'incident-002',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    type: 'xss_attempt',
    severity: 'high',
    status: 'resolved',
    description: 'Cross-site scripting attempt detected in user input',
    source: {
      ip: '198.51.100.23',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      userId: 'user-123',
    },
    target: {
      resource: 'bot_config',
      action: 'update',
      data: '<script>alert("XSS")</script>',
    },
    impact: {
      affectedUsers: 0,
      dataExposed: false,
      systemCompromised: false,
    },
    response: {
      actionsTaken: ['Malicious input blocked', 'Input validation improved'],
      containmentMeasures: ['Request sanitized'],
      resolution: 'XSS attempt successfully blocked',
      lessonsLearned: 'Enhance input validation rules',
    },
    createdBy: 'system',
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
  },
];

const mockScans: SecurityScan[] = [
  {
    id: 'scan-001',
    name: 'Vulnerability Assessment',
    type: 'vulnerability',
    status: 'completed',
    progress: 100,
    findings: [
      {
        id: 'finding-001',
        scanId: 'scan-001',
        severity: 'high',
        category: 'Configuration',
        title: 'Weak SSL/TLS Configuration',
        description: 'Server supports weak cipher suites',
        remediation: 'Disable weak cipher suites and enable only strong encryption',
        affectedResources: ['web-server', 'load-balancer'],
        falsePositive: false,
        verified: true,
        status: 'open',
      },
    ],
    startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    config: { depth: 'full', includeDependencies: true },
  },
  {
    id: 'scan-002',
    name: 'GDPR Compliance Check',
    type: 'compliance',
    status: 'running',
    progress: 65,
    findings: [],
    startedAt: new Date(Date.now() - 30 * 60 * 1000),
    config: { framework: 'GDPR', includeDataMapping: true },
  },
];

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);

  const [config, setConfig] = useState<SecurityConfig>(defaultSecurityConfig);
  const [incidents, setIncidents] = useState<SecurityIncident[]>(mockIncidents);
  const [scans, setScans] = useState<SecurityScan[]>(mockScans);
  const [isLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Calculate metrics
  const metrics: SecurityMetrics = {
    overallScore: 85,
    incidents: {
      total: incidents.length,
      activeIncidents: incidents.filter(i => i.status !== 'resolved' && i.status !== 'false_positive').length,
      bySeverity: incidents.reduce((acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: incidents.reduce((acc, incident) => {
        acc[incident.status] = (acc[incident.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: incidents.reduce((acc, incident) => {
        acc[incident.type] = (acc[incident.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      last24h: incidents.filter(i => Date.now() - i.timestamp.getTime() < 24 * 60 * 60 * 1000).length,
      last7d: incidents.filter(i => Date.now() - i.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000).length,
      last30d: incidents.filter(i => Date.now() - i.timestamp.getTime() < 30 * 24 * 60 * 60 * 1000).length,
    },
    scans: {
      total: scans.length,
      completed: scans.filter(s => s.status === 'completed').length,
      failed: scans.filter(s => s.status === 'failed').length,
      findings: scans.reduce((acc, scan) => acc + scan.findings.length, 0),
      averageDuration: scans
        .filter(s => s.startedAt && s.completedAt)
        .reduce((acc, s) => acc + (s.completedAt!.getTime() - s.startedAt!.getTime()), 0) /
        scans.filter(s => s.startedAt && s.completedAt).length || 0,
    },
    compliance: {
      score: 78,
      frameworks: [
        { name: 'GDPR', score: 85, requirements: 25, compliant: 21, nonCompliant: 4 },
        { name: 'SOX', score: 72, requirements: 18, compliant: 13, nonCompliant: 5 },
        { name: 'HIPAA', score: 68, requirements: 30, compliant: 20, nonCompliant: 10 },
        { name: 'PCI-DSS', score: 88, requirements: 12, compliant: 11, nonCompliant: 1 },
      ],
    },
    threats: {
      blocked: 245,
      detected: 189,
      mitigated: 156,
      topThreats: [
        { name: 'XSS Attempts', count: 45 },
        { name: 'SQL Injection', count: 32 },
        { name: 'Rate Limiting', count: 28 },
        { name: 'Suspicious Login', count: 21 },
        { name: 'Malware Upload', count: 15 },
      ],
    },
  };

  // Configuration management
  const updateConfig = async (updates: Partial<SecurityConfig>): Promise<void> => {
    setConfig(prev => ({ ...prev, ...updates }));
    setLastUpdated(new Date());
  };

  const resetConfig = async (): Promise<void> => {
    setConfig(defaultSecurityConfig);
    setLastUpdated(new Date());
  };

  const exportConfig = (): string => {
    return JSON.stringify(config, null, 2);
  };

  const importConfig = async (configString: string): Promise<void> => {
    try {
      const importedConfig = JSON.parse(configString) as SecurityConfig;
      setConfig(importedConfig);
      setLastUpdated(new Date());
    } catch {
      throw new Error('Invalid configuration format');
    }
  };

  // Incident management
  const createIncident = async (incidentData: Omit<SecurityIncident, 'id' | 'timestamp' | 'createdBy' | 'updatedAt'>): Promise<SecurityIncident> => {
    const newIncident: SecurityIncident = {
      ...incidentData,
      id: `incident-${Date.now()}`,
      timestamp: new Date(),
      createdBy: currentUser?.username || 'system',
      updatedAt: new Date(),
    };

    setIncidents(prev => [newIncident, ...prev]);
    return newIncident;
  };

  const updateIncident = async (id: string, updates: Partial<SecurityIncident>): Promise<void> => {
    setIncidents(prev => prev.map(incident =>
      incident.id === id ? { ...incident, ...updates, updatedAt: new Date() } : incident
    ));
  };

  const resolveIncident = async (id: string, resolution: string): Promise<void> => {
    const incident = incidents.find(i => i.id === id);
    if (incident) {
      updateIncident(id, { status: 'resolved', response: { ...incident.response, resolution } });
    }
  };

  const assignIncident = async (id: string, userId: string): Promise<void> => {
    updateIncident(id, { assignedTo: userId });
  };

  // Scan management
  const startScan = async (scanData: Omit<SecurityScan, 'id' | 'status' | 'progress' | 'findings' | 'startedAt' | 'completedAt'>): Promise<SecurityScan> => {
    const newScan: SecurityScan = {
      ...scanData,
      id: `scan-${Date.now()}`,
      status: 'running',
      progress: 0,
      findings: [],
      startedAt: new Date(),
    };

    setScans(prev => [newScan, ...prev]);

    // Simulate scan progress
    simulateScanProgress(newScan.id);

    return newScan;
  };

  const cancelScan = async (id: string): Promise<void> => {
    setScans(prev => prev.map(scan =>
      scan.id === id ? { ...scan, status: 'failed' } : scan
    ));
  };

  const scheduleScan = async (scanData: Omit<SecurityScan, 'id' | 'status' | 'progress' | 'findings' | 'startedAt' | 'completedAt'>, scheduledAt: Date): Promise<SecurityScan> => {
    const newScan: SecurityScan = {
      ...scanData,
      id: `scan-${Date.now()}`,
      status: 'pending',
      progress: 0,
      findings: [],
      scheduledAt,
    };

    setScans(prev => [newScan, ...prev]);
    return newScan;
  };

  // Finding management
  const markFindingAsFalsePositive = async (id: string): Promise<void> => {
    setScans(prev => prev.map(scan => ({
      ...scan,
      findings: scan.findings.map(finding =>
        finding.id === id ? { ...finding, falsePositive: true, status: 'false_positive' } : finding
      ),
    })));
  };

  const verifyFinding = async (id: string): Promise<void> => {
    setScans(prev => prev.map(scan => ({
      ...scan,
      findings: scan.findings.map(finding =>
        finding.id === id ? { ...finding, verified: true } : finding
      ),
    })));
  };

  const remediateFinding = async (id: string): Promise<void> => {
    setScans(prev => prev.map(scan => ({
      ...scan,
      findings: scan.findings.map(finding =>
        finding.id === id ? { ...finding, status: 'resolved' } : finding
      ),
    })));
  };

  // Real-time monitoring
  const enableRealTimeMonitoring = async (): Promise<void> => {
    await updateConfig({ monitoring: { ...config.monitoring, realTimeMonitoring: true } });
  };

  const disableRealTimeMonitoring = async (): Promise<void> => {
    await updateConfig({ monitoring: { ...config.monitoring, realTimeMonitoring: false } });
  };

  // Threat detection
  const getThreats = (): SecurityIncident[] => {
    return incidents.filter(incident =>
      incident.status !== 'resolved' && incident.status !== 'false_positive'
    );
  };

  const blockIP = async (ip: string, reason: string): Promise<void> => {
    const newIncident: SecurityIncident = {
      id: `incident-${Date.now()}`,
      timestamp: new Date(),
      type: 'policy_violation',
      severity: 'medium',
      status: 'resolved',
      description: `IP ${ip} blocked: ${reason}`,
      source: { ip, userAgent: 'system' },
      target: { resource: 'network', action: 'block' },
      impact: { affectedUsers: 0, dataExposed: false, systemCompromised: false },
      response: {
        actionsTaken: [`IP ${ip} blocked`],
        containmentMeasures: ['Network access blocked'],
        resolution: 'IP successfully blocked',
        lessonsLearned: 'Monitor for similar patterns',
      },
      createdBy: currentUser?.username || 'system',
      updatedAt: new Date(),
    };

    await createIncident(newIncident);
  };

  const unblockIP = async (ip: string): Promise<void> => {
    // In a real implementation, this would remove the IP from the blocklist
    console.log(`IP ${ip} unblocked`);
  };

  // Compliance
  const runComplianceCheck = async (framework: string): Promise<SecurityScan> => {
    const scan: SecurityScan = {
      id: `scan-${Date.now()}`,
      name: `${framework} Compliance Check`,
      type: 'compliance',
      status: 'running',
      progress: 0,
      findings: [],
      config: { framework },
    };

    return startScan(scan);
  };

  const getComplianceReport = async (framework: string): Promise<string> => {
    const complianceData = metrics.compliance.frameworks.find(f => f.name === framework);
    return JSON.stringify(complianceData, null, 2);
  };

  // UI helper functions
  const getSeverityColor = (severity: string): string => {
    const colorMap: Record<string, string> = {
      critical: 'error',
      high: 'error',
      medium: 'warning',
      low: 'success',
      info: 'info',
    };
    return colorMap[severity] || 'neutral';
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      open: 'error',
      investigating: 'warning',
      resolved: 'success',
      false_positive: 'neutral',
      pending: 'info',
      running: 'info',
      completed: 'success',
      failed: 'error',
    };
    return colorMap[status] || 'neutral';
  };

  const getIncidentIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      xss_attempt: <ShieldCheckIcon className="w-5 h-5" />,
      csrf_attempt: <LockClosedIcon className="w-5 h-5" />,
      rate_limit_exceeded: <ChartBarIcon className="w-5 h-5" />,
      suspicious_login: <ExclamationTriangleIcon className="w-5 h-5" />,
      data_breach: <XCircleIcon className="w-5 h-5" />,
      malware_detected: <NoSymbolIcon className="w-5 h-5" />,
      policy_violation: <CheckCircleIcon className="w-5 h-5" />,
    };
    return iconMap[type] || <ShieldCheckIcon className="w-5 h-5" />;
  };

  const getScanIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      vulnerability: <ShieldCheckIcon className="w-5 h-5" />,
      compliance: <CheckCircleIcon className="w-5 h-5" />,
      penetration: <Cog6ToothIcon className="w-5 h-5" />,
      code_review: <EyeIcon className="w-5 h-5" />,
    };
    return iconMap[type] || <ShieldCheckIcon className="w-5 h-5" />;
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Simulate scan progress
  const simulateScanProgress = (scanId: string): void => {
    const interval = setInterval(() => {
      setScans(prev => {
        const scan = prev.find(s => s.id === scanId);
        if (!scan || scan.status !== 'running') {
          clearInterval(interval);
          return prev;
        }

        const newProgress = Math.min(scan.progress + Math.random() * 20, 95);
        return prev.map(s =>
          s.id === scanId ? { ...s, progress: newProgress } : s
        );
      });
    }, 1000);

    // Complete scan after 10 seconds
    setTimeout(() => {
      clearInterval(interval);
      setScans(prev => prev.map(s =>
        s.id === scanId
          ? {
            ...s,
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            findings: generateMockFindings(scanId)
          }
          : s
      ));
    }, 10000);
  };

  const generateMockFindings = (scanId: string): SecurityFinding[] => {
    const mockFindings: SecurityFinding[] = [
      {
        id: `finding-${Date.now()}-1`,
        scanId,
        severity: 'high',
        category: 'Authentication',
        title: 'Weak Password Policy',
        description: 'System allows passwords that do not meet complexity requirements',
        remediation: 'Implement stronger password policy with minimum 12 characters, mixed case, numbers, and special characters',
        affectedResources: ['user-authentication', 'password-reset'],
        falsePositive: false,
        verified: false,
        status: 'open',
      },
      {
        id: `finding-${Date.now()}-2`,
        scanId,
        severity: 'medium',
        category: 'Configuration',
        title: 'Missing Security Headers',
        description: 'HTTP security headers are not properly configured',
        remediation: 'Configure HSTS, CSP, and X-Frame-Options headers',
        affectedResources: ['web-server'],
        falsePositive: false,
        verified: true,
        status: 'open',
      },
    ];
    return mockFindings;
  };

  const contextValue: SecurityContextType = {
    config,
    isLoading,
    lastUpdated,
    incidents,
    activeIncidents: incidents.filter(i => i.status !== 'resolved' && i.status !== 'false_positive'),
    recentIncidents: incidents.slice(0, 5),
    scans,
    activeScans: scans.filter(s => s.status === 'running' || s.status === 'pending'),
    recentFindings: scans.flatMap(s => s.findings).slice(0, 5),
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

  if (!currentUser) {
    return (
      <AnimatedBox
        animation="fade-in"
        duration={300}
      >
        <div className="p-6 flex justify-center items-center min-h-[400px]">
          <div className="card bg-base-100 shadow-xl max-w-sm text-center">
            <div className="card-body items-center">
              <ShieldCheckIcon className="w-16 h-16 text-warning mb-4" />
              <h2 className="card-title text-2xl mb-2">Access Denied</h2>
              <p className="text-base-content/70">
                Please log in to access the security dashboard.
              </p>
            </div>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <SecurityContext.Provider value={contextValue}>
      <AnimatedBox
        animation="fade-in"
        duration={300}
      >
        <div className="w-full">
          {/* Security Header */}
          <div className="card bg-base-100 shadow-xl mb-6 border-l-4 border-primary">
            <div className="card-body">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <ShieldCheckIcon className="w-8 h-8 text-primary" />
                  <div>
                    <h2 className="card-title text-xl">
                      Security Dashboard
                    </h2>
                    <p className="text-sm text-base-content/70">
                      System Status: {metrics.incidents.activeIncidents > 0 ? 'Attention Needed' : 'Secure'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`badge ${metrics.overallScore >= 80 ? 'badge-success' : metrics.overallScore >= 60 ? 'badge-warning' : 'badge-error'} gap-1`}>
                    <ShieldCheckIcon className="w-4 h-4" />
                    Score: {metrics.overallScore}
                  </div>
                  <div className="badge badge-ghost gap-1">
                    <ArrowPathIcon className="w-4 h-4" />
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Active Incidents</h3>
                <div className="text-3xl font-bold text-error">
                  {metrics.incidents.activeIncidents}
                </div>
                <div className="text-sm text-base-content/70">
                  {metrics.incidents.last24h} in last 24h
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Threats Blocked</h3>
                <div className="text-3xl font-bold text-success">
                  {metrics.threats.blocked}
                </div>
                <div className="text-sm text-base-content/70">
                  {metrics.threats.detected} detected
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Open Findings</h3>
                <div className="text-3xl font-bold text-warning">
                  {metrics.scans.findings}
                </div>
                <div className="text-sm text-base-content/70">
                  From {metrics.scans.completed} scans
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Compliance</h3>
                <div className="text-3xl font-bold text-info">
                  {metrics.compliance.score}%
                </div>
                <div className="text-sm text-base-content/70">
                  Average across frameworks
                </div>
              </div>
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                Recent Incidents
              </h3>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.slice(0, 5).map((incident) => (
                      <tr key={incident.id} className="hover">
                        <td>
                          <div className="flex items-center gap-2">
                            {getIncidentIcon(incident.type)}
                            <span className="font-medium capitalize">{incident.type.replace(/_/g, ' ')}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`badge badge-${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                          </div>
                        </td>
                        <td>
                          <div className={`badge badge-${getStatusColor(incident.status)} badge-outline`}>
                            {incident.status.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm truncate max-w-xs" title={incident.description}>
                            {incident.description}
                          </div>
                        </td>
                        <td className="text-sm opacity-70">
                          {formatDuration(Date.now() - incident.timestamp.getTime())} ago
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBox>
    </SecurityContext.Provider>
  );
};

export default SecurityProvider;

// Export types for external use
export type { SecurityContextType };