const fs = require('fs');
const file = 'src/client/src/components/ProviderConfiguration/ProviderConfigModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const const ProviderConfigModal/g, 'const ProviderConfigModal');

const endPattern = `    </div>
  );`;

const correctEnd = `    </div>
  );
};

export default ProviderConfigModal;`;

const index = code.indexOf(endPattern);

if (index !== -1) {
  code = code.substring(0, index) + correctEnd + '\n';
}

fs.writeFileSync(file, code);
