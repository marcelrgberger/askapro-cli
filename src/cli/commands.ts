import chalk from 'chalk';
import { listModels, getModel } from '../llm/models.js';
import type { Conversation } from '../agent/conversation.js';

export interface CommandContext {
  conversation: Conversation;
  setModel: (model: string) => void;
  setRole: (role: string | null) => void;
}

export async function handleCommand(input: string, ctx: CommandContext): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return false;

  const parts = trimmed.slice(1).split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
      showHelp();
      return true;

    case 'roles':
      showRoles();
      return true;

    case 'role':
      if (args[0]) {
        ctx.setRole(args[0]);
        console.log(chalk.cyan(`  Role activated: ${args[0]}`));
      } else {
        ctx.setRole(null);
        console.log(chalk.cyan('  Role deactivated — automatic routing active'));
      }
      return true;

    case 'model':
      if (args[0]) {
        ctx.setModel(args[0]);
        const info = getModel(args[0]);
        console.log(chalk.cyan(`  Model switched: ${info.name}`));
        console.log(chalk.dim('  Saved as default for future sessions.'));
      } else {
        await showModels(ctx.conversation.model);
      }
      return true;

    case 'clear':
      ctx.conversation.clear();
      console.log(chalk.cyan('  Conversation cleared'));
      return true;

    case 'exit':
    case 'quit':
      console.log(chalk.dim('\n  Goodbye!\n'));
      process.exit(0);

    default:
      console.log(chalk.yellow(`  Unknown command: /${cmd}`));
      console.log(chalk.dim('  Type /help for a list of all commands'));
      return true;
  }
}

async function showModels(currentModel: string): Promise<void> {
  console.log();
  console.log(chalk.bold('  Available models (live from OpenAI API):'));
  console.log();

  try {
    const models = await listModels();

    const tierLabels: Record<string, string> = {
      flagship: 'Flagship',
      pro: 'Pro (Extended Thinking)',
      fast: 'Fast & Affordable',
      nano: 'Nano (Cheapest)',
      reasoning: 'Reasoning (o-series)',
      codex: 'Codex (Code)',
      legacy: 'Legacy',
      other: 'Other',
    };

    const grouped = new Map<string, typeof models>();
    for (const m of models) {
      if (!grouped.has(m.tier)) grouped.set(m.tier, []);
      grouped.get(m.tier)!.push(m);
    }

    const tierOrder = ['flagship', 'pro', 'fast', 'nano', 'reasoning', 'codex', 'legacy', 'other'];
    for (const tier of tierOrder) {
      const tierModels = grouped.get(tier);
      if (!tierModels?.length) continue;

      console.log(chalk.cyan(`  ${tierLabels[tier] || tier}:`));
      for (const m of tierModels.slice(0, 5)) {
        const isCurrent = m.id === currentModel;
        const marker = isCurrent ? chalk.green(' <-- active') : '';
        const name = isCurrent ? chalk.bold(m.id) : chalk.dim(m.id);
        console.log(`    ${name}${marker}`);
      }
      console.log();
    }

    console.log(chalk.dim(`  Total: ${models.length} models available`));
  } catch {
    console.log(chalk.yellow('  Could not fetch models from API.'));
    console.log(chalk.dim(`  Current model: ${currentModel}`));
  }

  console.log();
  console.log(chalk.dim('  Usage: /model <name>   e.g. /model gpt-5.4'));
  console.log(chalk.dim('  Tip: Set per project in OPENAI.md: "- model: gpt-5.4-mini"'));
  console.log();
}

function showHelp(): void {
  console.log();
  console.log(chalk.bold('  Commands:'));
  console.log();
  console.log('  /help               Show this help');
  console.log('  /roles              List all expert roles');
  console.log('  /role <id>          Activate a specific role');
  console.log('  /role               Enable automatic routing');
  console.log('  /model <name>       Switch model');
  console.log('  /model              Show available models (live from API)');
  console.log('  /clear              Clear conversation');
  console.log('  /exit               Exit');
  console.log();
  console.log(chalk.dim('  Planned: /docs, /export, /panel, /memory, /compact'));
  console.log();
}

function showRoles(): void {
  console.log();
  console.log(chalk.bold('  Expert Roles (85+):'));
  console.log();

  const categories = [
    { name: 'Legal (General)', roles: 'fachanwalt-arbeitsrecht, fachanwalt-familienrecht, fachanwalt-mietrecht, fachanwalt-verkehrsrecht, fachanwalt-erbrecht, fachanwalt-strafrecht, fachanwalt-medizinrecht, fachanwalt-sozialrecht, fachanwalt-verwaltungsrecht, fachanwalt-it-recht, fachanwalt-handelsrecht, fachanwalt-insolvenzrecht, fachanwalt-baurecht, fachanwalt-versicherungsrecht, fachanwalt-steuerrecht' },
    { name: 'Legal (Germany-specific)', roles: 'fachanwalt-migrationsrecht, fachanwalt-transportrecht, fachanwalt-urheberrecht, fachanwalt-bankrecht, fachanwalt-agrarrecht, fachanwalt-vergaberecht, fachanwalt-gewerblicher-rechtsschutz, fachanwalt-internationales-wirtschaftsrecht, notar, betriebsratberater, opferanwalt, datenschutzanwalt-de, fachanwalt-sportrecht, fachanwalt-wettbewerbsrecht, fachanwalt-energierecht, rechtsanwalt-mediator, fachanwalt-wehrrecht, fachanwalt-kirchenrecht, fachanwalt-waffenrecht, fachanwalt-tierrecht' },
    { name: 'Tax & Finance', roles: 'steuerberater, finanzberater, wirtschaftspruefer, buchhalter, lohnabrechner, controller, foerdermittelberater, zollberater' },
    { name: 'Medical', roles: 'allgemeinmediziner, kardiologe, orthopaedie, neurologe, dermatologe, zahnarzt, psychologe, apotheker, ernaehrungsberater, medizincontroller' },
    { name: 'Real Estate', roles: 'architekt, immobilienbewerter, immobilienmakler, bauingenieur, energieberater, hausverwalter' },
    { name: 'Insurance', roles: 'versicherungsberater, rentenberater, bu-berater, kv-berater' },
    { name: 'Business', roles: 'unternehmensberater, gruendungsberater, hr-berater, datenschutzbeauftragter, compliance-officer, patentberater' },
    { name: 'Academia', roles: 'lektor, statistiker, fachuebersetzer, paedagoge' },
    { name: 'Engineering', roles: 'kfz-sachverstaendiger, elektroingenieur, umweltgutachter, it-sachverstaendiger' },
    { name: 'Consumer', roles: 'verbraucherschutz, schuldnerberater, reiserecht, behoerdenlotse, mediator' },
  ];

  for (const cat of categories) {
    console.log(chalk.cyan(`  ${cat.name}:`));
    console.log(chalk.dim(`    ${cat.roles}`));
    console.log();
  }

  console.log(chalk.dim('  Usage: /role <id>   e.g. /role steuerberater'));
  console.log();
}
