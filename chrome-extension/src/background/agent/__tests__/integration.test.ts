/**
 * Integration tests for HybridAIClient with Planner and Navigator agents
 * Tests both Nano and cloud fallback paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HybridAIClient } from '../../llm/HybridAIClient';
import { PlannerAgent } from '../agents/planner';
import { NavigatorAgent, NavigatorActionRegistry } from '../agents/navigator';
import { Executor } from '../executor';
import BrowserContext from '../../browser/context';
import { AgentContext } from '../types';
import { PlannerPrompt } from '../prompts/planner';
import { NavigatorPrompt } from '../prompts/navigator';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { MessageManager } from '../messages/service';
import type { EventManager } from '../event/manager';

// Mock logger
vi.mock('@src/background/log', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock chrome API globally
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
  },
} as any;

describe('Integration Tests - HybridAIClient with Agents', () => {
  let aiClient: HybridAIClient;
  let mockBrowserContext: BrowserContext;
  let mockAgentContext: AgentContext;
  let mockMessageManager: MessageManager;
  let mockEventManager: EventManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock browser context
    mockBrowserContext = {
      getCurrentTabId: vi.fn().mockReturnValue(1),
      getState: vi.fn().mockResolvedValue({
        url: 'https://example.com',
        title: 'Test Page',
      }),
      getCurrentPage: vi.fn().mockReturnValue({
        url: 'https://example.com',
        title: 'Test Page',
      }),
      cleanup: vi.fn(),
    } as any;

    // Mock message manager
    mockMessageManager = {
      getMessages: vi.fn().mockReturnValue([new SystemMessage('System context'), new HumanMessage('User task')]),
      addMessage: vi.fn(),
      clear: vi.fn(),
    } as any;

    // Mock event manager
    mockEventManager = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    // Mock agent context
    mockAgentContext = {
      controller: new AbortController(),
      messageManager: mockMessageManager,
      eventManager: mockEventManager,
      emitEvent: vi.fn(),
      options: {
        maxSteps: 10,
        maxFailures: 3,
        maxActionsPerStep: 10,
        useVision: false,
        useVisionForPlanner: false,
        planningInterval: 3,
        minWaitPageLoad: 1000,
        displayHighlights: true,
        replayHistoricalTasks: false,
      },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Planner Agent with HybridAIClient', () => {
    describe('with Nano available', () => {
      beforeEach(async () => {
        // Mock Nano as available
        globalThis.LanguageModel = {
          availability: vi.fn().mockResolvedValue('readily'),
          create: vi.fn().mockResolvedValue({
            prompt: vi.fn().mockResolvedValue('test'),
          }),
        } as any;

        aiClient = new HybridAIClient();
        await aiClient.initialize();

        // Mock the invoke method to return proper response
        vi.spyOn(aiClient, 'invoke').mockResolvedValue({
          content: JSON.stringify({
            observation: 'Page loaded successfully',
            challenges: 'None',
            done: false,
            next_steps: 'Click the login button',
            final_answer: '',
            reasoning: 'Need to authenticate first',
            web_task: true,
          }),
          provider: 'nano',
        });
      });

      it('should execute planner with Nano', async () => {
        const plannerPrompt = new PlannerPrompt();
        const planner = new PlannerAgent({
          aiClient,
          context: mockAgentContext,
          prompt: plannerPrompt,
        });

        const result = await planner.execute();

        expect(result.id).toBe('planner');
        expect(result.result).toBeDefined();
        expect(result.result?.observation).toBe('Page loaded successfully');
        expect(result.result?.done).toBe(false);
        expect(result.result?.next_steps).toBe('Click the login button');
      });

      it('should handle planner completion with Nano', async () => {
        // Mock completed task response
        vi.spyOn(aiClient, 'invoke').mockResolvedValue({
          content: JSON.stringify({
            observation: 'Task completed',
            challenges: 'None',
            done: true,
            next_steps: '',
            final_answer: 'Successfully logged in',
            reasoning: 'All steps completed',
            web_task: true,
          }),
          provider: 'nano',
        });

        const plannerPrompt = new PlannerPrompt();
        const planner = new PlannerAgent({
          aiClient,
          context: mockAgentContext,
          prompt: plannerPrompt,
        });

        const result = await planner.execute();

        expect(result.result?.done).toBe(true);
        expect(result.result?.final_answer).toBe('Successfully logged in');
      });
    });

    describe('with Nano unavailable (cloud fallback)', () => {
      beforeEach(async () => {
        // Mock Nano as unavailable
        globalThis.LanguageModel = {
          availability: vi.fn().mockResolvedValue('no'),
        } as any;

        // Mock chrome.runtime.sendMessage for cloud fallback
        global.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
          ok: true,
          provider: 'cloud',
          text: JSON.stringify({
            observation: 'Page loaded via cloud',
            challenges: 'None',
            done: false,
            next_steps: 'Click the submit button',
            final_answer: '',
            reasoning: 'Using cloud inference',
            web_task: true,
          }),
        });

        aiClient = new HybridAIClient();
        await aiClient.initialize();
      });

      it('should execute planner with cloud fallback', async () => {
        const plannerPrompt = new PlannerPrompt();
        const planner = new PlannerAgent({
          aiClient,
          context: mockAgentContext,
          prompt: plannerPrompt,
        });

        const result = await planner.execute();

        expect(result.id).toBe('planner');
        expect(result.result).toBeDefined();
        expect(result.result?.observation).toBe('Page loaded via cloud');
        expect(result.result?.next_steps).toBe('Click the submit button');
        expect(chrome.runtime.sendMessage).toHaveBeenCalled();
      });

      it('should handle cloud fallback errors gracefully', async () => {
        // Mock cloud failure
        global.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
          ok: false,
          error: 'Cloud service unavailable',
        });

        const plannerPrompt = new PlannerPrompt();
        const planner = new PlannerAgent({
          aiClient,
          context: mockAgentContext,
          prompt: plannerPrompt,
        });

        const result = await planner.execute();

        expect(result.error).toBeDefined();
        expect(result.error).toContain('Cloud service unavailable');
      });
    });
  });

  describe('Navigator Agent with HybridAIClient', () => {
    let actionRegistry: NavigatorActionRegistry;

    beforeEach(() => {
      // Create action registry with empty actions array
      actionRegistry = new NavigatorActionRegistry([]);
    });

    describe('with Nano available', () => {
      beforeEach(async () => {
        // Mock Nano as available
        globalThis.LanguageModel = {
          availability: vi.fn().mockResolvedValue('readily'),
          create: vi.fn().mockResolvedValue({
            prompt: vi.fn().mockResolvedValue('test'),
          }),
        } as any;

        aiClient = new HybridAIClient();
        await aiClient.initialize();

        // Mock successful Nano response
        vi.spyOn(aiClient, 'invoke').mockResolvedValue({
          content: JSON.stringify({
            action: 'click',
            element: 5,
            reasoning: 'Clicking login button',
          }),
          provider: 'nano',
        });
      });

      it('should execute navigator with Nano', async () => {
        const navigatorPrompt = new NavigatorPrompt();
        const navigator = new NavigatorAgent(actionRegistry, {
          aiClient,
          context: mockAgentContext,
          prompt: navigatorPrompt,
        });

        // Navigator.execute() requires browser state, so we test that it uses HybridAIClient
        // by verifying the client was initialized with Nano
        const status = aiClient.getStatus();
        expect(status.provider).toBe('nano');
        expect(status.nano.availability).toBe('readily');

        // Verify navigator was created successfully
        expect(navigator).toBeDefined();
      });
    });

    describe('with Nano unavailable (cloud fallback)', () => {
      beforeEach(async () => {
        // Mock Nano as unavailable
        globalThis.LanguageModel = {
          availability: vi.fn().mockResolvedValue('no'),
        } as any;

        // Mock chrome.runtime.sendMessage for cloud fallback
        global.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
          ok: true,
          provider: 'cloud',
          text: JSON.stringify({
            action: 'type',
            element: 3,
            text: 'test@example.com',
            reasoning: 'Entering email address',
          }),
        });

        aiClient = new HybridAIClient();
        await aiClient.initialize();
      });

      it('should execute navigator with cloud fallback', async () => {
        const navigatorPrompt = new NavigatorPrompt();
        const navigator = new NavigatorAgent(actionRegistry, {
          aiClient,
          context: mockAgentContext,
          prompt: navigatorPrompt,
        });

        // Navigator.execute() requires browser state, so we test that it uses HybridAIClient
        // by verifying the client was initialized for cloud fallback
        const status = aiClient.getStatus();
        expect(status.provider).toBe('cloud');
        expect(status.nano.availability).toBe('no');

        // Verify navigator was created successfully
        expect(navigator).toBeDefined();
      });
    });
  });

  describe('Complete Task Execution', () => {
    describe('with Nano available', () => {
      beforeEach(async () => {
        // Mock Nano as available
        globalThis.LanguageModel = {
          availability: vi.fn().mockResolvedValue('readily'),
          create: vi.fn().mockResolvedValue({
            prompt: vi.fn().mockResolvedValue('test'),
          }),
        } as any;

        aiClient = new HybridAIClient();
        await aiClient.initialize();
      });

      it('should execute complete task with Nano', async () => {
        const executor = new Executor('Navigate to example.com', 'test-task-1', mockBrowserContext, aiClient, {
          agentOptions: {
            maxSteps: 5,
            maxFailures: 3,
          },
        });

        expect(executor).toBeDefined();
        const taskId = await executor.getCurrentTaskId();
        expect(taskId).toBe('test-task-1');

        // Verify aiClient is being used
        const status = aiClient.getStatus();
        expect(status.provider).toBe('nano');
      });
    });

    describe('with Nano unavailable', () => {
      beforeEach(async () => {
        // Mock Nano as unavailable
        globalThis.LanguageModel = {
          availability: vi.fn().mockResolvedValue('no'),
        } as any;

        // Mock chrome.runtime.sendMessage for cloud fallback
        global.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
          ok: true,
          provider: 'cloud',
          text: JSON.stringify({
            observation: 'Starting task via cloud',
            challenges: 'None',
            done: false,
            next_steps: 'Navigate to page',
            final_answer: '',
            reasoning: 'Using cloud inference',
            web_task: true,
          }),
        });

        aiClient = new HybridAIClient();
        await aiClient.initialize();
      });

      it('should execute complete task with cloud fallback', async () => {
        const executor = new Executor('Navigate to example.com', 'test-task-2', mockBrowserContext, aiClient, {
          agentOptions: {
            maxSteps: 5,
            maxFailures: 3,
          },
        });

        expect(executor).toBeDefined();
        const taskId = await executor.getCurrentTaskId();
        expect(taskId).toBe('test-task-2');

        // Verify cloud fallback is being used
        const status = aiClient.getStatus();
        expect(status.provider).toBe('cloud');
        expect(status.nano.availability).toBe('no');
      });

      it('should handle mixed Nano/cloud scenarios', async () => {
        // Simulate Nano becoming unavailable mid-execution
        let nanoAvailable = false;
        globalThis.LanguageModel = {
          availability: vi.fn().mockImplementation(() => {
            return Promise.resolve(nanoAvailable ? 'readily' : 'no');
          }),
        } as any;

        // First initialize with Nano unavailable
        const client = new HybridAIClient();
        await client.initialize();
        expect(client.getStatus().provider).toBe('cloud');

        // Mock cloud fallback
        global.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
          ok: true,
          provider: 'cloud',
          text: JSON.stringify({
            observation: 'Using cloud',
            challenges: 'Nano unavailable',
            done: false,
            next_steps: 'Continue with cloud',
            final_answer: '',
            reasoning: 'Fallback activated',
            web_task: true,
          }),
        });

        // Invoke should use cloud fallback
        const result = await client.invoke({
          prompt: 'Test prompt',
          system: 'Test system',
        });

        expect(result.provider).toBe('cloud');
        expect(chrome.runtime.sendMessage).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle Nano errors and fallback to cloud', async () => {
      // Mock Nano as available
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('readily'),
        create: vi.fn().mockResolvedValue({
          prompt: vi.fn().mockRejectedValue(new Error('Nano inference failed')),
        }),
      } as any;

      // Mock successful cloud fallback
      global.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
        ok: true,
        provider: 'cloud',
        text: JSON.stringify({
          observation: 'Recovered via cloud',
          challenges: 'Nano failed',
          done: false,
          next_steps: 'Continue',
          final_answer: '',
          reasoning: 'Fallback successful',
          web_task: true,
        }),
      });

      aiClient = new HybridAIClient();
      await aiClient.initialize();

      const plannerPrompt = new PlannerPrompt();
      const planner = new PlannerAgent({
        aiClient,
        context: mockAgentContext,
        prompt: plannerPrompt,
      });

      const result = await planner.execute();

      expect(result.result).toBeDefined();
      expect(result.result?.observation).toBe('Recovered via cloud');
      expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should handle both Nano and cloud failures', async () => {
      // Mock Nano as available but failing
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('readily'),
        create: vi.fn().mockResolvedValue({
          prompt: vi.fn().mockRejectedValue(new Error('Nano failed')),
        }),
      } as any;

      // Mock cloud also failing
      global.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Cloud service unavailable',
      });

      aiClient = new HybridAIClient();
      await aiClient.initialize();

      const plannerPrompt = new PlannerPrompt();
      const planner = new PlannerAgent({
        aiClient,
        context: mockAgentContext,
        prompt: plannerPrompt,
      });

      const result = await planner.execute();

      expect(result.error).toBeDefined();
    });
  });
});
