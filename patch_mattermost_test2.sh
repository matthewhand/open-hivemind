#!/bin/bash
sed -i 's/  class MockMattermostService extends EventEmitter {/  return class MockMattermostService extends EventEmitter {/g' tests/integrations/mattermost/MattermostService.test.ts
sed -i '/    public resolveAgentContext(): any {/a\    }\n  };\n});' tests/integrations/mattermost/MattermostService.test.ts
