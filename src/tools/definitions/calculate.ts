import type { ToolDefinition } from '../registry.js';

function safeEval(expr: string): number {
  // Simple recursive descent parser for basic math
  const tokens = expr.replace(/\s/g, '').split('');
  let pos = 0;

  function peek(): string { return tokens[pos] || ''; }
  function next(): string { return tokens[pos++] || ''; }

  function parseNumber(): number {
    let num = '';
    if (peek() === '-') { num += next(); }
    while (/[0-9.]/.test(peek())) { num += next(); }
    if (!num || num === '-') throw new Error('Expected number');
    return parseFloat(num);
  }

  function parseFactor(): number {
    if (peek() === '(') {
      next(); // consume (
      const val = parseExpr();
      if (next() !== ')') throw new Error('Expected )');
      return val;
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let val = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const right = parseFactor();
      val = op === '*' ? val * right : val / right;
    }
    return val;
  }

  function parseExpr(): number {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error('Unexpected character: ' + tokens[pos]);
  return result;
}

export const calculateTool: ToolDefinition = {
  name: 'calculate',
  description: 'Performs mathematical calculations. Useful for maintenance calculations, tax calculations, interest calculations, etc.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression (basic arithmetic: +, -, *, /, parentheses)',
      },
      description: {
        type: 'string',
        description: 'Description of the calculation',
      },
    },
    required: ['expression'],
  },
  async execute(params) {
    const expression = params.expression as string;
    const desc = params.description as string;

    try {
      const result = safeEval(expression);

      if (!isFinite(result)) {
        return `Error: Result is not a valid number.`;
      }

      const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(2);

      return desc
        ? `${desc}: ${expression} = ${formatted}`
        : `${expression} = ${formatted}`;
    } catch (err) {
      return `Calculation error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
