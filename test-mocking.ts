import * as tsyringe from 'tsyringe'; // to ensure ts-node config is right
import fs from 'fs';
jest.mock('fs');
console.log(fs.existsSync.name);
