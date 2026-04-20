import { auditMiddleware } from '../src/server/middleware/audit.ts';
import { extractIdentity } from '../src/middleware/quotaMiddleware.ts';
import assert from 'assert';

console.log('Verifying auditMiddleware logic...');
const auditReq: any = { headers: { 'user-agent': 'UA' }, ip: '1.1.1.1' };
auditMiddleware(auditReq, {} as any, () => {});
assert.strictEqual(auditReq.auditUser, 'anonymous');
assert.strictEqual(auditReq.auditIp, '1.1.1.1');
assert.strictEqual(auditReq.auditUserAgent, 'UA');

console.log('Verifying extractIdentity logic...');
const identity = extractIdentity({ headers: { 'x-bot-id': 'B1' } } as any);
assert.strictEqual(identity.entityId, 'B1');
assert.strictEqual(identity.entityType, 'bot');

console.log('Global verification PASSED!');
