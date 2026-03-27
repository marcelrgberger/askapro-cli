import chalk from 'chalk';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked for terminal output
marked.use({ renderer: new TerminalRenderer({ tab: 2 }) });

export function renderMarkdown(text: string): string {
  // Render markdown to terminal-formatted text
  return marked.parse(text) as string;
}

export function renderWelcome(): void {
  console.log();
  console.log(chalk.bold.green('  askapro') + chalk.dim(' — Ask a Pro. Expert Document Agent.'));
  console.log(chalk.dim('  85+ Expert Roles | Document Analysis | Professional Outputs'));
  console.log();
  console.log(chalk.dim('  Commands: /help, /roles, /docs, /export, /model, /clear'));
  console.log(chalk.dim('  Quit: Ctrl+C or /exit'));
  console.log();
  console.log(
    chalk.dim.italic(
      '  Note: AI-assisted analysis — does not replace professional consultation.\n'
    )
  );
}

export function renderRoleActivation(roleName: string): void {
  console.log(chalk.cyan(`  [${roleName} activated]`));
}

export function renderToolCall(toolName: string): void {
  process.stdout.write(chalk.dim(`  [Tool: ${toolName}] `));
}

export function renderToolResult(toolName: string, truncated: boolean): void {
  if (truncated) {
    console.log(chalk.dim('(truncated)'));
  } else {
    console.log(chalk.dim('OK'));
  }
}

export function renderError(message: string): void {
  console.error(chalk.red(`\n  Error: ${message}\n`));
}

export function renderInfo(message: string): void {
  console.log(chalk.blue(`  ${message}`));
}

export function renderPrompt(): string {
  return chalk.green('askapro') + chalk.dim(' > ');
}
