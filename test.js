const { execFileSync } = require('child_process');

function exec(cmd, args, cwd) {
  console.log(`exec: ${cmd} ${args.join(' ')} (cwd: ${cwd})`);
}

exec('git', ['clone', '--depth', '1', 'https://github.com/myrepo', '/tmp/repo'], '/tmp');
exec('git', ['clone', '--depth', '1', 'git@github.com:myrepo/repo.git', '/tmp/repo'], '/tmp');
exec('git', ['clone', '--depth', '1', '--ext-cmd=curl http://169.254.169.254/latest/meta-data/', '/tmp/repo'], '/tmp');
