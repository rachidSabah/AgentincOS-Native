// ============================================================
// Agentic OS V2 — AI-Native Terminal Engine
// ============================================================
import type { TerminalCommand, TerminalResult } from './types';
import { v4 as uuidv4 } from 'uuid';

class TerminalEngine {
  private history: Array<{ command: TerminalCommand; result: TerminalResult }> = [];

  parseNaturalLanguage(input: string): string {
    const lower = input.toLowerCase().trim();

    // Natural language → command mapping
    const mappings: Array<{ pattern: RegExp; command: string }> = [
      { pattern: /^(list|show|display)\s+(all\s+)?files/i, command: 'ls -la' },
      { pattern: /^(what|which)\s+(folder|directory|dir)\s+am\s+i\s+in/i, command: 'pwd' },
      { pattern: /^(go|change|navigate|cd)\s+to\s+(.+)/i, command: 'cd $2' },
      { pattern: /^(create|make)\s+(a\s+)?(file|dir|directory)\s+(?:called\s+)?(.+)/i, command: 'mkdir $4' },
      { pattern: /^(delete|remove)\s+(?:the\s+)?(?:file\s+)?(.+)/i, command: 'rm $2' },
      { pattern: /^(read|show|cat|display)\s+(?:the\s+)?(?:file\s+)?(.+)/i, command: 'cat $2' },
      { pattern: /^(what)\s+(is\s+)?(?:the\s+)?(?:current\s+)?(?:time|date)/i, command: 'date' },
      { pattern: /^(how\s+much)\s+(?:disk\s+)?space/i, command: 'df -h' },
      { pattern: /^(what)\s+(?:processes|apps|programs)\s+are\s+running/i, command: 'ps aux' },
      { pattern: /^(find|search)\s+(?:for\s+)?(.+)\s+(?:in\s+)?files?/i, command: 'grep -r "$2" .' },
      { pattern: /^(run|execute)\s+(.+)/i, command: '$2' },
      { pattern: /^(install)\s+(.+)/i, command: 'bun add $2' },
      { pattern: /^(git)\s+(.+)/i, command: 'git $2' },
    ];

    for (const mapping of mappings) {
      const match = lower.match(mapping.pattern);
      if (match) {
        let cmd = mapping.command;
        for (let i = match.length - 1; i >= 1; i--) {
          cmd = cmd.replace(`$${i}`, match[i].trim());
        }
        return cmd;
      }
    }

    // If no pattern matches, return as-is (might be a raw command)
    return input;
  }

  async execute(command: string, sessionId?: string): Promise<TerminalResult> {
    const cmd: TerminalCommand = {
      id: uuidv4(),
      command,
      sessionId: sessionId ?? 'default',
      timestamp: Date.now(),
    };

    const startTime = Date.now();

    // Simulated command execution
    // In production, this would use child_process or a sandbox
    const output = this.simulateExecution(command);
    const exitCode = output.includes('error') || output.includes('not found') ? 1 : 0;

    const result: TerminalResult = {
      id: uuidv4(),
      commandId: cmd.id,
      output,
      exitCode,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };

    this.history.push({ command: cmd, result });
    return result;
  }

  planExecution(task: string): string[] {
    const commands: string[] = [];

    if (task.toLowerCase().includes('setup') || task.toLowerCase().includes('init')) {
      commands.push('mkdir -p src/components src/lib src/app/api');
      commands.push('touch package.json tsconfig.json');
      commands.push('bun install');
    } else if (task.toLowerCase().includes('deploy')) {
      commands.push('bun run build');
      commands.push('bun run start');
    } else if (task.toLowerCase().includes('test')) {
      commands.push('bun test');
    } else {
      commands.push(task);
    }

    return commands;
  }

  getHistory(): Array<{ command: TerminalCommand; result: TerminalResult }> {
    return [...this.history];
  }

  private simulateExecution(command: string): string {
    const parts = command.split(' ');
    const base = parts[0];

    const responses: Record<string, string> = {
      'ls': 'src/  node_modules/  package.json  tsconfig.json  prisma/  public/',
      'pwd': '/home/user/agentic-os',
      'date': new Date().toISOString(),
      'whoami': 'agentic-user',
      'ps': 'PID  COMMAND\n1    agentic-os\n2    brain-engine\n3    agent-runtime',
      'df': 'Filesystem  Size  Used  Avail  Use%\n/dev/sda1   50G   12G   38G   24%',
      'git': 'git: usage information displayed',
      'bun': 'bun: package manager commands available',
    };

    if (responses[base]) return responses[base];

    if (base === 'cat') {
      return `# ${parts[1] ?? 'file'}\nFile contents would be displayed here.`;
    }
    if (base === 'cd') {
      return `Changed directory to ${parts[1] ?? '~'}`;
    }
    if (base === 'mkdir') {
      return `Created directory: ${parts.slice(1).join(' ')}`;
    }
    if (base === 'rm') {
      return `Removed: ${parts.slice(1).join(' ')}`;
    }
    if (base === 'echo') {
      return parts.slice(1).join(' ');
    }
    if (base === 'grep') {
      return 'src/lib/engine.ts:3:match found\nsrc/app/api/route.ts:12:match found';
    }

    return `$ ${command}\nCommand executed successfully.`;
  }
}

export const terminalEngine = new TerminalEngine();
