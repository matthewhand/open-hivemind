const { CreateGuardProfileSchema } = require('./src/validation/schemas/guardProfilesSchema');
const validProfile = {
        body: {
          name: 'Test Profile',
          description: 'Test description',
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'owner',
              allowedUsers: ['user1'],
              allowedTools: ['tool1'],
            },
            rateLimit: {
              enabled: true,
              maxRequests: 100,
              windowMs: 60000,
            },
            contentFilter: {
              enabled: true,
              strictness: 'medium',
              blockedTerms: ['password', 'secret'],
            },
          },
        },
      };

const result = CreateGuardProfileSchema.safeParse(validProfile);
console.log(JSON.stringify(result.error.errors, null, 2));
