import { z } from 'zod';

/** POST /api/marketplace/install */
export const InstallPluginSchema = z.object({
  body: z.object({
    repoUrl: z
      .string({ required_error: 'repoUrl is required' })
      .min(1, { message: 'repoUrl must not be empty' })
      .url({ message: 'repoUrl must be a valid URL' }),
  }),
});

/** POST /api/marketplace/uninstall/:name  and  POST /api/marketplace/update/:name */
export const PluginNameParamSchema = z.object({
  params: z.object({
    name: z.string().min(1, { message: 'Plugin name is required' }),
  }),
});
