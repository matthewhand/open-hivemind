import { baseClient } from './baseClient';
import { botApi } from './botApi';
import { configApi } from './configApi';
import { personaApi } from './personaApi';
import { monitoringApi } from './monitoringApi';
import { dashboardApi } from './dashboardApi';
import { systemApi } from './systemApi';

export * from './apiTypes';

// Re-export specific methods from baseClient for backward compatibility
class ApiService {
  // Base client methods
  public get = baseClient.get.bind(baseClient);
  public post = baseClient.post.bind(baseClient);
  public put = baseClient.put.bind(baseClient);
  public delete = baseClient.delete.bind(baseClient);
  public patch = baseClient.patch.bind(baseClient);
  public getBlob = baseClient.getBlob.bind(baseClient);
  public request = baseClient.request.bind(baseClient);
  public onRateLimitUpdate = baseClient.onRateLimitUpdate.bind(baseClient);

  // Config API
  public getConfig = configApi.getConfig;
  public getConfigSources = configApi.getConfigSources;
  public getLlmProfiles = configApi.getLlmProfiles;
  public reloadConfig = configApi.reloadConfig;
  public exportConfig = configApi.exportConfig;
  public clearCache = configApi.clearCache;
  public getSecureConfigs = configApi.getSecureConfigs;
  public getSecureConfig = configApi.getSecureConfig;
  public saveSecureConfig = configApi.saveSecureConfig;
  public deleteSecureConfig = configApi.deleteSecureConfig;
  public backupSecureConfigs = configApi.backupSecureConfigs;
  public restoreSecureConfigs = configApi.restoreSecureConfigs;
  public getSecureConfigInfo = configApi.getSecureConfigInfo;
  public getGlobalConfig = configApi.getGlobalConfig;
  public updateGlobalConfig = configApi.updateGlobalConfig;

  // Bot API
  public getBots = botApi.getBots;
  public getBotHistory = botApi.getBotHistory;
  public createBot = botApi.createBot;
  public updateBot = botApi.updateBot;
  public cloneBot = botApi.cloneBot;
  public deleteBot = botApi.deleteBot;
  public startBot = botApi.startBot;
  public stopBot = botApi.stopBot;

  // Persona API
  public getPersonas = personaApi.getPersonas;
  public getPersona = personaApi.getPersona;
  public createPersona = personaApi.createPersona;
  public updatePersona = personaApi.updatePersona;
  public clonePersona = personaApi.clonePersona;
  public deletePersona = personaApi.deletePersona;

  // Dashboard API
  public getStatus = dashboardApi.getStatus;
  public getActivity = dashboardApi.getActivity;
  public acknowledgeAlert = dashboardApi.acknowledgeAlert;
  public resolveAlert = dashboardApi.resolveAlert;
  public exportActivity = dashboardApi.exportActivity;
  public exportAnalytics = dashboardApi.exportAnalytics;

  // Monitoring API
  public getApiEndpointsStatus = monitoringApi.getApiEndpointsStatus;
  public getApiEndpointStatus = monitoringApi.getApiEndpointStatus;
  public addApiEndpoint = monitoringApi.addApiEndpoint;
  public updateApiEndpoint = monitoringApi.updateApiEndpoint;
  public removeApiEndpoint = monitoringApi.removeApiEndpoint;
  public startApiMonitoring = monitoringApi.startApiMonitoring;
  public stopApiMonitoring = monitoringApi.stopApiMonitoring;
  public getSystemHealth = monitoringApi.getSystemHealth;
  public getServiceHealth = monitoringApi.getServiceHealth;

  // System API
  public listSystemBackups = systemApi.listSystemBackups;
  public createSystemBackup = systemApi.createSystemBackup;
  public restoreSystemBackup = systemApi.restoreSystemBackup;
  public deleteSystemBackup = systemApi.deleteSystemBackup;
  public downloadSystemBackup = systemApi.downloadSystemBackup;
  public getSystemInfo = systemApi.getSystemInfo;
  public getEnvOverrides = systemApi.getEnvOverrides;
}

export const apiService = new ApiService();
