import { CodexToolHandler } from '../tools/handlers.js';
import { InMemorySessionStorage } from '../session/storage.js';
import { executeCommand } from '../utils/command.js';

// Mock the command execution
jest.mock('../utils/command.js', () => ({
  executeCommand: jest.fn(),
}));

const mockedExecuteCommand = executeCommand as jest.MockedFunction<
  typeof executeCommand
>;

describe('Additional Args Support', () => {
  let handler: CodexToolHandler;
  let sessionStorage: InMemorySessionStorage;

  beforeEach(() => {
    sessionStorage = new InMemorySessionStorage();
    handler = new CodexToolHandler(sessionStorage);
    mockedExecuteCommand.mockClear();
    mockedExecuteCommand.mockResolvedValue({
      stdout: 'Test response',
      stderr: '',
    });
  });

  test('should pass additional args to codex CLI', async () => {
    await handler.execute({
      prompt: 'Test prompt',
      additionalArgs: ['--search', '--dangerously-bypass-approvals-and-sandbox'],
    });

    expect(mockedExecuteCommand).toHaveBeenCalledWith('codex', [
      'exec',
      '--model',
      'gpt-5-codex',
      '--skip-git-repo-check',
      '--search',
      '--dangerously-bypass-approvals-and-sandbox',
      'Test prompt',
    ]);
  });

  test('should work with empty additional args array', async () => {
    await handler.execute({
      prompt: 'Test prompt',
      additionalArgs: [],
    });

    expect(mockedExecuteCommand).toHaveBeenCalledWith('codex', [
      'exec',
      '--model',
      'gpt-5-codex',
      '--skip-git-repo-check',
      'Test prompt',
    ]);
  });

  test('should work without additional args parameter', async () => {
    await handler.execute({
      prompt: 'Test prompt',
    });

    expect(mockedExecuteCommand).toHaveBeenCalledWith('codex', [
      'exec',
      '--model',
      'gpt-5-codex',
      '--skip-git-repo-check',
      'Test prompt',
    ]);
  });

  test('should combine additional args with model selection', async () => {
    await handler.execute({
      prompt: 'Complex task',
      model: 'gpt-4',
      additionalArgs: ['--search'],
    });

    expect(mockedExecuteCommand).toHaveBeenCalledWith('codex', [
      'exec',
      '--model',
      'gpt-4',
      '--skip-git-repo-check',
      '--search',
      'Complex task',
    ]);
  });

  test('should work with sessions and additional args', async () => {
    const sessionId = sessionStorage.createSession();

    await handler.execute({
      prompt: 'Session test',
      sessionId,
      additionalArgs: ['--search'],
    });

    expect(mockedExecuteCommand).toHaveBeenCalledWith('codex', [
      'exec',
      '--model',
      'gpt-5-codex',
      '--skip-git-repo-check',
      '--search',
      'Session test',
    ]);
  });

  test('should work with resume and additional args', async () => {
    const sessionId = sessionStorage.createSession();

    // First call to establish conversation ID
    mockedExecuteCommand.mockResolvedValueOnce({
      stdout: 'Initial response',
      stderr: 'conversation id: test-conv-123',
    });

    await handler.execute({
      prompt: 'First prompt',
      sessionId,
    });

    mockedExecuteCommand.mockClear();
    mockedExecuteCommand.mockResolvedValue({
      stdout: 'Resume response',
      stderr: '',
    });

    // Second call with resume
    await handler.execute({
      prompt: 'Follow up',
      sessionId,
      additionalArgs: ['--search'],
    });

    expect(mockedExecuteCommand).toHaveBeenCalledWith('codex', [
      'resume',
      'test-conv-123',
      '--model',
      'gpt-5-codex',
      '--skip-git-repo-check',
      '--search',
      'Follow up',
    ]);
  });

  test('should handle multiple additional args in correct order', async () => {
    await handler.execute({
      prompt: 'Test',
      additionalArgs: ['--arg1', 'value1', '--arg2', '--arg3', 'value3'],
    });

    expect(mockedExecuteCommand).toHaveBeenCalledWith('codex', [
      'exec',
      '--model',
      'gpt-5-codex',
      '--skip-git-repo-check',
      '--arg1',
      'value1',
      '--arg2',
      '--arg3',
      'value3',
      'Test',
    ]);
  });

  test('should validate additional args as array of strings', async () => {
    await expect(
      handler.execute({
        prompt: 'Test',
        additionalArgs: 'invalid' as unknown as string[],
      })
    ).rejects.toThrow();
  });

  test('should reject non-string elements in additional args', async () => {
    await expect(
      handler.execute({
        prompt: 'Test',
        additionalArgs: ['--valid', 123 as unknown as string],
      })
    ).rejects.toThrow();
  });
});
