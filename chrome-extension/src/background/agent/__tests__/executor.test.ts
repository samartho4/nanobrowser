/**
 * Tests for Executor with HybridAIClient integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Executor } from '../executor';
import type { HybridAIClient } from '../../llm/HybridAIClient';
import BrowserContext from '../../browser/context';

describe('Executor', () => {
  let mockAIClient: HybridAIClient;
  let mockBrowserContext: BrowserContext;

  beforeEach(() => {
    // Mock HybridAIClient
    mockAIClient = {
      initialize: vi.fn(),
      invoke: vi.fn(),
      getStatus: vi.fn(),
    } as any;

    // Mock BrowserContext
    mockBrowserContext = {
      getCurrentTabId: vi.fn().mockReturnValue(1),
      getState: vi.fn(),
      getCurrentPage: vi.fn(),
      cleanup: vi.fn(),
    } as any;
  });

  it('should create executor with HybridAIClient', () => {
    const executor = new Executor('test task', 'test-task-id', mockBrowserContext, mockAIClient, {
      agentOptions: {
        maxSteps: 10,
        maxFailures: 3,
      },
    });

    expect(executor).toBeDefined();
    expect(executor.getCurrentTaskId).toBeDefined();
  });

  it('should accept aiClient parameter instead of navigatorLLM', () => {
    // This test verifies the interface change
    expect(() => {
      new Executor('test task', 'test-task-id', mockBrowserContext, mockAIClient);
    }).not.toThrow();
  });

  it('should not require plannerLLM or extractorLLM in extraArgs', () => {
    // This test verifies that the old LLM parameters are removed
    const executor = new Executor('test task', 'test-task-id', mockBrowserContext, mockAIClient, {
      agentOptions: {
        maxSteps: 5,
      },
      generalSettings: {
        maxSteps: 5,
        maxFailures: 3,
        maxActionsPerStep: 10,
        useVision: false,
        useVisionForPlanner: false,
        planningInterval: 3,
        minWaitPageLoad: 1000,
        displayHighlights: true,
        replayHistoricalTasks: false,
      },
    });

    expect(executor).toBeDefined();
  });
});
