import { isSafeUrl } from '@hivemind/shared-types';

async function run() {
  const check = await isSafeUrl('http://169.254.169.254');
  console.log(check);
}

run();
