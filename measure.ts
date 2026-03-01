import 'reflect-metadata';
import { container } from 'tsyringe';
import { MattermostService } from './packages/adapter-mattermost/src/MattermostService';

// Mock container setup
container.register('StartupGreetingService', { useValue: { emit: () => {} } });

async function main() {
  const service = (MattermostService as any).getInstance();
  const mockClient = {
    getChannelPosts: async () => {
      const posts = [];
      for (let i = 0; i < 50; i++) {
        posts.push({ user_id: `user-${i}`, id: `post-${i}` });
      }
      return posts;
    },
    getUser: async (id: string) => {
      // Simulate network delay of 10ms per user fetch
      await new Promise(resolve => setTimeout(resolve, 10));
      return { id, first_name: 'John', last_name: 'Doe', username: 'johndoe' };
    }
  };

  service.clients.set('test-bot', mockClient);

  const start = Date.now();
  await service.fetchMessages('test-channel', 50, 'test-bot');
  const end = Date.now();

  console.log(`Execution time: ${end - start}ms`);
}

main().catch(console.error);
