import * as readline from 'node:readline';
import { Conversation } from '../agent/conversation.js';
import { agentLoop } from '../agent/loop.js';
import { buildSystemPrompt } from '../agent/system-prompt.js';
import { createToolRegistry } from '../tools/registry.js';
import { handleCommand } from './commands.js';
import { renderWelcome, renderPrompt, renderError, renderToolCall, renderInfo } from './renderer.js';
import type { CliArgs } from './args.js';
import { loadSettings, saveSettings } from '../config/settings.js';
import { ensureGlobalDirs } from '../config/paths.js';
import { DEFAULT_MODEL, fetchModels, getModel } from '../llm/models.js';
import { loadConfig } from '../config/loader.js';
import chalk from 'chalk';

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function selectModel(rl: readline.Interface): Promise<string> {
  console.log();
  console.log(chalk.bold('  Welcome! Fetching available models from OpenAI...'));

  let modelList;
  try {
    modelList = await fetchModels();
  } catch {
    console.log(chalk.yellow('  Could not fetch models. Using default.'));
    saveSettings({ model: DEFAULT_MODEL });
    return DEFAULT_MODEL;
  }

  // Show top models grouped by tier for selection
  const recommended = modelList.filter((m) => m.tier === 'flagship' || m.tier === 'fast' || m.tier === 'nano' || m.tier === 'reasoning').slice(0, 10);

  console.log();
  const defaultIdx = recommended.findIndex((m) => m.id === DEFAULT_MODEL);

  for (let i = 0; i < recommended.length; i++) {
    const m = recommended[i];
    const isDefault = m.id === DEFAULT_MODEL;
    const prefix = isDefault ? chalk.green(`  ${i + 1}. `) : chalk.dim(`  ${i + 1}. `);
    const name = isDefault ? chalk.bold(m.name) : m.name;
    const tier = chalk.dim(` [${m.tier}]`);
    const def = isDefault ? chalk.green(' [default]') : '';
    console.log(`${prefix}${name}${tier}${def}`);
  }

  console.log();
  console.log(chalk.dim(`  (${modelList.length} models total — type a model ID for any other)`));
  const answer = await askQuestion(rl, chalk.cyan(`  Your choice [${(defaultIdx >= 0 ? defaultIdx : 0) + 1}]: `));

  // Check if numeric selection
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < recommended.length) {
    const selected = recommended[idx].id;
    saveSettings({ model: selected });
    console.log(chalk.green(`  Model set: ${recommended[idx].name}`));
    console.log(chalk.dim('  Change anytime with /model'));
    console.log();
    return selected;
  }

  // Check if typed a model ID directly
  if (answer && modelList.some((m) => m.id === answer)) {
    saveSettings({ model: answer });
    console.log(chalk.green(`  Model set: ${answer}`));
    console.log();
    return answer;
  }

  // Default
  saveSettings({ model: DEFAULT_MODEL });
  const defaultInfo = getModel(DEFAULT_MODEL);
  console.log(chalk.green(`  Using default: ${defaultInfo.name}`));
  console.log();
  return DEFAULT_MODEL;
}

function getProjectModel(): string | null {
  const config = loadConfig();
  if (!config.projectInstructions) return null;

  // Parse model from project OPENAI.md
  const match = config.projectInstructions.match(/^-\s*(?:model|modell|default):\s*(\S+)/im);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

export async function startRepl(args: CliArgs): Promise<void> {
  ensureGlobalDirs();

  if (args.apiKey) {
    saveSettings({ apiKey: args.apiKey });
  }

  const settings = loadSettings();
  const toolRegistry = await createToolRegistry();

  // Model selection priority: CLI arg > project OPENAI.md > saved setting > first-time selection
  let model: string;

  if (args.model && args.model !== DEFAULT_MODEL) {
    // Explicit CLI argument
    model = args.model;
  } else {
    const projectModel = getProjectModel();
    if (projectModel) {
      // Project-specific model from OPENAI.md
      model = projectModel;
    } else if (settings.model && settings.model !== 'gpt-4o') {
      // Previously saved model choice (not the old default)
      model = settings.model;
    } else if (!settings.model || settings.model === 'gpt-4o') {
      // First time or old default — ask user in interactive mode
      if (!args.print) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: true,
        });
        model = await selectModel(rl);
        rl.close();
      } else {
        model = DEFAULT_MODEL;
      }
    } else {
      model = settings.model;
    }
  }

  const conversation = new Conversation(model);
  let activeRole: string | null = args.role || null;

  conversation.setSystemPrompt(buildSystemPrompt(activeRole || undefined));

  const commandCtx = {
    conversation,
    setModel: (m: string) => {
      conversation.model = m;
      saveSettings({ model: m });
    },
    setRole: (r: string | null) => {
      activeRole = r;
      conversation.setSystemPrompt(buildSystemPrompt(activeRole || undefined));
    },
  };

  // Non-interactive mode
  if (args.print) {
    conversation.addUserMessage(args.print);
    try {
      await agentLoop(conversation, toolRegistry, {
        onText: (text) => process.stdout.write(text),
      });
      console.log();
    } catch (err) {
      renderError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  // Interactive REPL
  renderWelcome();
  renderInfo(`Model: ${getModel(model).name}`);
  if (activeRole) renderInfo(`Role: ${activeRole}`);
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: renderPrompt(),
    terminal: true,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input.startsWith('/')) {
      await handleCommand(input, commandCtx);
      rl.prompt();
      return;
    }

    conversation.addUserMessage(input);

    try {
      console.log();
      await agentLoop(conversation, toolRegistry, {
        onText: (text) => process.stdout.write(text),
        onToolStart: (name) => renderToolCall(name),
      });
      console.log('\n');
    } catch (err) {
      renderError(err instanceof Error ? err.message : String(err));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n');
    process.exit(0);
  });
}
