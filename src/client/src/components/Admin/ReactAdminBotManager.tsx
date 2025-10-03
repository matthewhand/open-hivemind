import React from 'react';
import {
  Admin,
  Resource,
  List,
  Datagrid,
  TextField,
  BooleanField,
  Create,
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  SelectInput,
  ArrayInput,
  SimpleFormIterator,
  Show,
  SimpleShowLayout,
  EditButton,
  ShowButton,
  DeleteButton,
  ChipField,
  ArrayField,
  SingleFieldList,
  useGetList,
  useCreate,
  useUpdate,
  useDelete,
  useNotify,
  useRefresh,
  useRedirect,
  TopToolbar,
  ExportButton,
  CreateButton,
  FilterButton,
  useListContext,
  Pagination,
  SaveButton,
  Toolbar
} from 'react-admin';
import {
  Box,
  Chip,
  Typography,
  Alert,
  Switch,
  FormControlLabel,
  Paper,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { green, red, orange, grey } from '@mui/material/colors';
import { botDataProvider } from '../../services/botDataProvider';

// Custom data provider wrapper for react-admin
const reactAdminDataProvider = {
  getList: async (resource: string, params: any) => {
    if (resource !== 'bots') throw new Error('Unknown resource');
    
    const result = await botDataProvider.getList({
      pagination: {
        page: params.pagination.page,
        perPage: params.pagination.perPage
      },
      sort: {
        field: params.sort.field,
        order: params.sort.order
      },
      filter: params.filter
    });
    
    return {
      data: result.data.map(bot => ({ ...bot, id: bot.id || bot.name })),
      total: result.total
    };
  },

  getOne: async (resource: string, params: any) => {
    if (resource !== 'bots') throw new Error('Unknown resource');
    const result = await botDataProvider.getOne(params.id);
    return { data: { ...result.data, id: result.data.id || result.data.name } };
  },

  getMany: async (resource: string, params: any) => {
    if (resource !== 'bots') throw new Error('Unknown resource');
    const promises = params.ids.map((id: string) => botDataProvider.getOne(id));
    const results = await Promise.all(promises);
    return { data: results.map(r => ({ ...r.data, id: r.data.id || r.data.name })) };
  },

  getManyReference: async (resource: string, params: any) => {
    // Not implemented for bots
    return { data: [], total: 0 };
  },

  create: async (resource: string, params: any) => {
    if (resource !== 'bots') throw new Error('Unknown resource');
    const result = await botDataProvider.create(params.data);
    return { data: { ...result.data, id: result.data.id || result.data.name } };
  },

  update: async (resource: string, params: any) => {
    if (resource !== 'bots') throw new Error('Unknown resource');
    const result = await botDataProvider.update(params.id, params.data);
    return { data: { ...result.data, id: result.data.id || result.data.name } };
  },

  updateMany: async (resource: string, params: any) => {
    if (resource !== 'bots') throw new Error('Unknown resource');
    const promises = params.ids.map((id: string) => 
      botDataProvider.update(id, params.data)
    );
    await Promise.all(promises);
    return { data: params.ids };
  },

  delete: async (resource: string, params: any) => {
    if (resource !== 'bots') throw new Error('Unknown resource');
    await botDataProvider.delete(params.id);
    return { data: { id: params.id } };
  },

  deleteMany: async (resource: string, params: any) => {
    if (resource !== 'bots') throw new Error('Unknown resource');
    await botDataProvider.deleteMany(params.ids);
    return { data: params.ids };
  }
};

// Custom status field component
const BotStatusField: React.FC<{ record?: any }> = ({ record }) => {
  if (!record) return null;

  const getBotStatus = () => {
    const hasMessageProvider = record.messageProvider;
    const hasLlmProvider = record.llmProvider;
    const hasOverrides = record.envOverrides && Object.keys(record.envOverrides).length > 0;

    if (!hasMessageProvider || !hasLlmProvider) {
      return { status: 'incomplete', color: red[500], icon: <CancelIcon fontSize="small" /> };
    }
    if (hasOverrides) {
      return { status: 'env-override', color: orange[500], icon: <WarningIcon fontSize="small" /> };
    }
    if (record.isActive) {
      return { status: 'active', color: green[500], icon: <CheckIcon fontSize="small" /> };
    }
    return { status: 'inactive', color: grey[500], icon: <CancelIcon fontSize="small" /> };
  };

  const status = getBotStatus();

  return (
    <Box display="flex" alignItems="center" gap={1}>
      {status.icon}
      <Typography variant="body2" style={{ color: status.color }}>
        {status.status}
      </Typography>
    </Box>
  );
};

// Custom MCP servers field
const MCPServersField: React.FC<{ record?: any }> = ({ record }) => {
  if (!record?.mcpServers || record.mcpServers.length === 0) {
    return <Typography variant="body2" color="text.secondary">None</Typography>;
  }

  return (
    <Box display="flex" gap={0.5} flexWrap="wrap">
      {record.mcpServers.slice(0, 3).map((server: string, index: number) => (
        <Chip key={index} label={server} size="small" />
      ))}
      {record.mcpServers.length > 3 && (
        <Chip label={`+${record.mcpServers.length - 3} more`} size="small" variant="outlined" />
      )}
    </Box>
  );
};

// Environment overrides field
const EnvOverridesField: React.FC<{ record?: any }> = ({ record }) => {
  if (!record?.envOverrides || Object.keys(record.envOverrides).length === 0) {
    return null;
  }

  return (
    <Alert severity="warning" sx={{ mt: 1 }}>
      <Typography variant="caption">
        {Object.keys(record.envOverrides).length} environment override(s) active
      </Typography>
    </Alert>
  );
};

// Custom list actions
const BotListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

// Custom bot list component
const BotList: React.FC = () => (
  <List
    actions={<BotListActions />}
    pagination={<Pagination rowsPerPageOptions={[10, 25, 50, 100]} />}
    sort={{ field: 'name', order: 'ASC' }}
    perPage={25}
  >
    <Datagrid
      rowClick="show"
      expand={<BotExpandPanel />}
      sx={{
        '& .RaDatagrid-expandIconCell': {
          width: '48px'
        }
      }}
    >
      <TextField source="name" label="Name" />
      <TextField source="messageProvider" label="Message Provider" />
      <TextField source="llmProvider" label="LLM Provider" />
      <BotStatusField label="Status" />
      <TextField source="persona" label="Persona" />
      <MCPServersField label="MCP Servers" />
      <BooleanField source="isActive" label="Active" />
      <ShowButton />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

// Expandable panel for bot details
const BotExpandPanel: React.FC<{ record?: any }> = ({ record }) => {
  if (!record) return null;

  return (
    <Card sx={{ margin: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Bot Details
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">System Instruction:</Typography>
            <Typography variant="body2" color="text.secondary">
              {record.systemInstruction || 'None'}
            </Typography>
          </Grid>
          
          {record.mcpGuard?.enabled && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">MCP Guard:</Typography>
              <Typography variant="body2" color="text.secondary">
                Type: {record.mcpGuard.type}
                {record.mcpGuard.type === 'custom' && record.mcpGuard.allowedUserIds?.length > 0 && (
                  <span> ({record.mcpGuard.allowedUserIds.length} users)</span>
                )}
              </Typography>
            </Grid>
          )}
          
          {record.createdAt && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Created:</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(record.createdAt).toLocaleString()}
              </Typography>
            </Grid>
          )}
          
          {record.updatedAt && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Last Updated:</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(record.updatedAt).toLocaleString()}
              </Typography>
            </Grid>
          )}
        </Grid>
        
        <EnvOverridesField record={record} />
      </CardContent>
    </Card>
  );
};

// Bot creation form
const BotCreate: React.FC = () => {
  const [providers, setProviders] = React.useState<any>({ messageProviders: [], llmProviders: [] });
  const [personas, setPersonas] = React.useState<any[]>([]);
  const [mcpServers, setMcpServers] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const [providersData, personasData, mcpData] = await Promise.all([
          botDataProvider.getProviders(),
          botDataProvider.getPersonas(),
          botDataProvider.getMCPServers()
        ]);
        setProviders(providersData);
        setPersonas(personasData);
        setMcpServers(mcpData);
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };
    loadOptions();
  }, []);

  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" required fullWidth />
        
        <SelectInput
          source="messageProvider"
          choices={providers.messageProviders.map((p: any) => ({ id: p.id, name: p.name }))}
          required
          fullWidth
        />
        
        <SelectInput
          source="llmProvider"
          choices={providers.llmProviders.map((p: any) => ({ id: p.id, name: p.name }))}
          required
          fullWidth
        />
        
        <SelectInput
          source="persona"
          choices={personas.map((p: any) => ({ id: p.key, name: p.name }))}
          defaultValue="default"
          fullWidth
        />
        
        <TextInput source="systemInstruction" multiline rows={3} fullWidth />
        
        <ArrayInput source="mcpServers" label="MCP Servers">
          <SimpleFormIterator inline>
            <SelectInput
              source=""
              choices={mcpServers.map((s: any) => ({ id: s.name || s, name: s.name || s }))}
            />
          </SimpleFormIterator>
        </ArrayInput>
        
        <BooleanInput source="mcpGuard.enabled" label="Enable MCP Guard" />
        <BooleanInput source="isActive" label="Active" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
};

// Bot edit form
const BotEdit: React.FC = () => {
  const [providers, setProviders] = React.useState<any>({ messageProviders: [], llmProviders: [] });
  const [personas, setPersonas] = React.useState<any[]>([]);
  const [mcpServers, setMcpServers] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const [providersData, personasData, mcpData] = await Promise.all([
          botDataProvider.getProviders(),
          botDataProvider.getPersonas(),
          botDataProvider.getMCPServers()
        ]);
        setProviders(providersData);
        setPersonas(personasData);
        setMcpServers(mcpData);
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };
    loadOptions();
  }, []);

  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" required fullWidth />
        
        <SelectInput
          source="messageProvider"
          choices={providers.messageProviders.map((p: any) => ({ id: p.id, name: p.name }))}
          required
          fullWidth
        />
        
        <SelectInput
          source="llmProvider"
          choices={providers.llmProviders.map((p: any) => ({ id: p.id, name: p.name }))}
          required
          fullWidth
        />
        
        <SelectInput
          source="persona"
          choices={personas.map((p: any) => ({ id: p.key, name: p.name }))}
          fullWidth
        />
        
        <TextInput source="systemInstruction" multiline rows={3} fullWidth />
        
        <ArrayInput source="mcpServers" label="MCP Servers">
          <SimpleFormIterator inline>
            <SelectInput
              source=""
              choices={mcpServers.map((s: any) => ({ id: s.name || s, name: s.name || s }))}
            />
          </SimpleFormIterator>
        </ArrayInput>
        
        <BooleanInput source="mcpGuard.enabled" label="Enable MCP Guard" />
        <BooleanInput source="isActive" label="Active" />
      </SimpleForm>
    </Edit>
  );
};

// Bot show/detail view
const BotShow: React.FC = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" label="Name" />
      <TextField source="messageProvider" label="Message Provider" />
      <TextField source="llmProvider" label="LLM Provider" />
      <BotStatusField label="Status" />
      <TextField source="persona" label="Persona" />
      <TextField source="systemInstruction" label="System Instruction" />
      <MCPServersField label="MCP Servers" />
      <BooleanField source="mcpGuard.enabled" label="MCP Guard Enabled" />
      <TextField source="mcpGuard.type" label="MCP Guard Type" />
      <BooleanField source="isActive" label="Active" />
      <TextField source="createdAt" label="Created At" />
      <TextField source="updatedAt" label="Updated At" />
      <EnvOverridesField />
    </SimpleShowLayout>
  </Show>
);

// Main React Admin component for bot management
const ReactAdminBotManager: React.FC = () => {
  return (
    <Admin
      dataProvider={reactAdminDataProvider}
      basename="/admin/bots"
      disableTelemetry
      title="Bot Management"
    >
      <Resource
        name="bots"
        list={BotList}
        create={BotCreate}
        edit={BotEdit}
        show={BotShow}
        options={{ label: 'Bots' }}
      />
    </Admin>
  );
};

export default ReactAdminBotManager;