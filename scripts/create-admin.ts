import 'dotenv/config';
import readline from 'readline';
import { createOrPromoteAdmin } from '../server/store';

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inlineVal] = arg.slice(2).split('=');
      if (inlineVal !== undefined) {
        result[key] = inlineVal;
      } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        result[key] = argv[i + 1];
        i++;
      }
    }
  }
  return result;
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, (ans) => resolve(ans.trim())));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let name = args.name || '';
  let email = args.email || '';
  let password = args.password || '';

  if (!email || !password) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      if (!name) {
        name = await ask(rl, 'Admin Full Name: ');
      }
      if (!email) {
        email = await ask(rl, 'Admin Email / Gmail: ');
      }
      if (!password) {
        password = await ask(rl, 'Admin Password (min 6 chars): ');
      }
    } finally {
      rl.close();
    }
  }

  if (!name || name.trim().length < 2) {
    name = 'SkyraCloud Admin';
  }
  if (!email || !email.includes('@')) {
    console.error('Error: Please provide a valid email address.');
    process.exit(1);
  }
  if (!password || password.length < 6) {
    console.error('Error: Password must be at least 6 characters.');
    process.exit(1);
  }

  const { user, action } = createOrPromoteAdmin(name, email, password);
  console.log(`\nAdmin user ${action} successfully:`);
  console.log(`  ID    : ${user.id}`);
  console.log(`  Name  : ${user.name}`);
  console.log(`  Email : ${user.email}`);
  console.log(`  Role  : ${user.role}\n`);
}

main().catch((err) => {
  console.error('Failed to create admin user:', err);
  process.exit(1);
});
