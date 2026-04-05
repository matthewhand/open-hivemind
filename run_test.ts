import { PathSecurityUtils } from './src/utils/PathSecurityUtils';
const name = 'backup-../../../etc/passwd';
console.log(PathSecurityUtils.sanitizeFilename(name));
