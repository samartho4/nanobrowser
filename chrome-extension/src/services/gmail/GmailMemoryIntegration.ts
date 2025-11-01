/**
 * Gmail Memory Integration Service
 *
 * Fetches real Gmail data and intelligently classifies it into the three-tier memory system:
 * - Episodic: Recent email interactions and conversations
 * - Semantic: Long-term facts about contacts, preferences, and patterns
 * - Procedural: Learned workflows and response patterns
 */

import { GmailService } from './GmailService';
import { memoryService, type Episode, type SemanticFact, type WorkflowPattern } from '../memory/MemoryService';
import { createLogger } from '@src/background/log';
import type { GmailMessage, GmailThread, GmailListMessagesResponse } from './types';

const logger = createLogger('GmailMemoryIntegration');

export interface EmailAnalysis {
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  timestamp: number;
  bodyText: string;
  isReply: boolean;
  isForward: boolean;
  priority: 'urgent' | 'important' | 'normal' | 'low';
  category: 'meeting' | 'finance' | 'project' | 'personal' | 'newsletter' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative';
  actionRequired: boolean;
  responseTime?: number; // Time taken to respond (if this is a response)
  threadLength: number;
}

export interface ContactPattern {
  email: string;
  name?: string;
  frequency: number;
  averageResponseTime: number;
  preferredTimes: number[]; // Hours of day (0-23)
  topics: string[];
  relationship: 'colleague' | 'client' | 'vendor' | 'personal' | 'unknown';
  importance: number; // 0-1 score
}

export interface EmailWorkflow {
  name: string;
  description: string;
  trigger: string;
  steps: Array<{
    action: 'reply' | 'forward' | 'label' | 'archive' | 'schedule';
    template?: string;
    timing?: number;
  }>;
  successRate: number;
  usageCount: number;
}

class GmailMemoryIntegration {
  private gmailService: GmailService;
  private analysisCache = new Map<string, EmailAnalysis>();

  constructor(gmailService: GmailService) {
    this.gmailService = gmailService;
  }

  /**
   * Main method to analyze Gmail and populate memory system
   */
  async analyzeAndPopulateMemory(
    workspaceId: string,
    options: {
      maxMessages?: number;
      daysBack?: number;
      includeThreads?: boolean;
    } = {},
  ): Promise<{
    episodicCount: number;
    semanticCount: number;
    proceduralCount: number;
    totalProcessed: number;
  }> {
    try {
      logger.info(`Starting Gmail memory analysis for workspace ${workspaceId}`);

      const { maxMessages = 100, daysBack = 30, includeThreads = true } = options;

      // 1. Fetch recent messages
      const messages = await this.fetchRecentMessages(maxMessages, daysBack);
      logger.info(`Fetched ${messages.length} messages for analysis`);

      // 2. Analyze each message
      const analyses: EmailAnalysis[] = [];
      for (const message of messages) {
        try {
          const analysis = await this.analyzeMessage(message);
          analyses.push(analysis);
          this.analysisCache.set(message.id, analysis);
        } catch (error) {
          logger.error(`Failed to analyze message ${message.id}:`, error);
        }
      }

      // 3. Extract and save memories
      const results = await Promise.all([
        this.extractEpisodicMemories(workspaceId, analyses),
        this.extractSemanticMemories(workspaceId, analyses),
        this.extractProceduralMemories(workspaceId, analyses),
      ]);

      const [episodicCount, semanticCount, proceduralCount] = results;

      logger.info(
        `Memory analysis complete: ${episodicCount} episodic, ${semanticCount} semantic, ${proceduralCount} procedural`,
      );

      return {
        episodicCount,
        semanticCount,
        proceduralCount,
        totalProcessed: analyses.length,
      };
    } catch (error) {
      logger.error('Failed to analyze Gmail and populate memory:', error);
      throw error;
    }
  }

  /**
   * Fetch recent messages from Gmail
   */
  private async fetchRecentMessages(maxMessages: number, daysBack: number): Promise<GmailMessage[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      // Build query for recent messages
      const query = `after:${cutoffTimestamp}`;

      const response = await this.gmailService.listMessages(query);
      const messageIds = response.messages?.slice(0, maxMessages) || [];

      // Fetch full message details
      const messages: GmailMessage[] = [];
      for (const msgRef of messageIds) {
        try {
          const fullMessage = await this.gmailService.getMessage(msgRef.id);
          messages.push(fullMessage);
        } catch (error) {
          logger.error(`Failed to fetch message ${msgRef.id}:`, error);
        }
      }

      return messages;
    } catch (error) {
      logger.error('Failed to fetch recent messages:', error);
      return [];
    }
  }

  /**
   * Analyze a single email message
   */
  private async analyzeMessage(message: GmailMessage): Promise<EmailAnalysis> {
    try {
      const headers = message.payload?.headers || [];
      const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const to = getHeader('To')
        .split(',')
        .map(email => email.trim());
      const timestamp = parseInt(message.internalDate || '0');

      // Extract body text
      const bodyText = this.extractBodyText(message);

      // Analyze message characteristics
      const isReply = subject.toLowerCase().startsWith('re:');
      const isForward = subject.toLowerCase().startsWith('fwd:') || subject.toLowerCase().startsWith('fw:');

      const priority = this.analyzePriority(subject, bodyText, from);
      const category = this.categorizeEmail(subject, bodyText, from);
      const sentiment = this.analyzeSentiment(bodyText);
      const actionRequired = this.detectActionRequired(bodyText);

      // Get thread length
      let threadLength = 1;
      if (message.threadId) {
        try {
          const thread = await this.gmailService.getThread(message.threadId);
          threadLength = thread.messages?.length || 1;
        } catch (error) {
          logger.error(`Failed to get thread length for ${message.threadId}:`, error);
        }
      }

      return {
        messageId: message.id,
        threadId: message.threadId || message.id,
        subject,
        from,
        to,
        timestamp,
        bodyText,
        isReply,
        isForward,
        priority,
        category,
        sentiment,
        actionRequired,
        threadLength,
      };
    } catch (error) {
      logger.error(`Failed to analyze message ${message.id}:`, error);
      throw error;
    }
  }

  /**
   * Extract episodic memories from email analyses
   */
  private async extractEpisodicMemories(workspaceId: string, analyses: EmailAnalysis[]): Promise<number> {
    let count = 0;

    try {
      // Group by conversation threads
      const threadGroups = new Map<string, EmailAnalysis[]>();
      analyses.forEach(analysis => {
        const threadId = analysis.threadId;
        if (!threadGroups.has(threadId)) {
          threadGroups.set(threadId, []);
        }
        threadGroups.get(threadId)!.push(analysis);
      });

      // Create episodes for each conversation
      for (const [threadId, threadEmails] of Array.from(threadGroups.entries())) {
        try {
          // Sort by timestamp
          threadEmails.sort((a, b) => a.timestamp - b.timestamp);

          const firstEmail = threadEmails[0];
          const lastEmail = threadEmails[threadEmails.length - 1];

          // Determine conversation outcome
          const hasResponse = threadEmails.some(email => email.isReply);
          const actionCompleted = !threadEmails.some(email => email.actionRequired);
          const outcome = hasResponse && actionCompleted ? 'success' : 'failure';

          // Create episode
          const sessionId = `gmail_${new Date(firstEmail.timestamp).toISOString().split('T')[0]}`;

          await memoryService.saveEpisode(workspaceId, sessionId, {
            query: `Email conversation: ${firstEmail.subject}`,
            actions: [
              `Received email from ${firstEmail.from}`,
              ...threadEmails
                .slice(1)
                .map(email => (email.isReply ? `Replied to ${email.from}` : `Received follow-up from ${email.from}`)),
            ],
            outcome,
            reasoning: `Conversation with ${threadEmails.length} messages. ${outcome === 'success' ? 'Successfully handled' : 'Needs attention'}.`,
            metadata: {
              agentId: 'gmail-integration',
              duration: lastEmail.timestamp - firstEmail.timestamp,
              contextUsed: [`thread:${threadId}`, `category:${firstEmail.category}`],
            },
          });

          // CONTEXT BRIDGE: Write Gmail context item for Context Pills
          const { contextManager } = await import('../context/ContextManager');
          await contextManager.write(
            workspaceId,
            {
              type: 'gmail',
              content: `${firstEmail.subject}\nFrom: ${firstEmail.from}\nTo: ${firstEmail.to}\n\n${firstEmail.bodyText.substring(0, 200)}...`,
              agentId: 'gmail-integration',
              sourceType: 'main',
              metadata: {
                source: 'gmail-conversation',
                priority: firstEmail.actionRequired ? 5 : 3,
                sessionId,
                relevanceScore: firstEmail.actionRequired ? 0.9 : 0.6,
              },
            },
            'episodic',
          );

          count++;
        } catch (error) {
          logger.error(`Failed to create episode for thread ${threadId}:`, error);
        }
      }

      logger.info(`Created ${count} episodic memories from ${analyses.length} emails`);
      return count;
    } catch (error) {
      logger.error('Failed to extract episodic memories:', error);
      return 0;
    }
  }

  /**
   * Extract semantic memories (facts about contacts, preferences, patterns)
   */
  private async extractSemanticMemories(workspaceId: string, analyses: EmailAnalysis[]): Promise<number> {
    let count = 0;

    try {
      // Extract contact patterns
      const contactPatterns = this.analyzeContactPatterns(analyses);

      for (const [email, pattern] of Array.from(contactPatterns.entries())) {
        try {
          // Save contact information
          await memoryService.saveFact(
            workspaceId,
            `contact:${email}`,
            {
              email: pattern.email,
              name: pattern.name,
              relationship: pattern.relationship,
              importance: pattern.importance,
              frequency: pattern.frequency,
              averageResponseTime: pattern.averageResponseTime,
              preferredTimes: pattern.preferredTimes,
              topics: pattern.topics,
            },
            {
              extractedFrom: 'gmail-analysis',
              relatedFacts: [`contact-frequency:${email}`, `contact-topics:${email}`],
            },
          );

          // Save response time patterns
          if (typeof pattern.averageResponseTime === 'number' && pattern.averageResponseTime > 0) {
            await memoryService.saveFact(workspaceId, `response-time:${email}`, pattern.averageResponseTime, {
              extractedFrom: 'gmail-analysis',
            });
          }

          // Save topic preferences
          if (pattern.topics.length > 0) {
            await memoryService.saveFact(workspaceId, `topics:${email}`, pattern.topics, {
              extractedFrom: 'gmail-analysis',
            });
          }

          // CONTEXT BRIDGE: Write contact context item for Context Pills
          const { contextManager } = await import('../context/ContextManager');
          await contextManager.write(
            workspaceId,
            {
              type: 'gmail',
              content: `Contact: ${pattern.name} (${pattern.email})\nRelationship: ${pattern.relationship}\nImportance: ${Math.round(pattern.importance * 100)}%\nFrequency: ${pattern.frequency} emails\nTopics: ${pattern.topics.join(', ')}`,
              agentId: 'gmail-integration',
              sourceType: 'main',
              metadata: {
                source: 'gmail-contact-analysis',
                priority: pattern.importance > 0.7 ? 4 : 2,
                sessionId: `gmail_contacts_${new Date().toISOString().split('T')[0]}`,
                relevanceScore: pattern.importance > 0.7 ? 0.8 : 0.5,
              },
            },
            'semantic',
          );

          count += 3; // Contact + response time + topics
        } catch (error) {
          logger.error(`Failed to save semantic facts for ${email}:`, error);
        }
      }

      // Extract general email preferences
      const preferences = this.analyzeEmailPreferences(analyses);
      for (const [key, value] of Object.entries(preferences)) {
        try {
          await memoryService.saveFact(workspaceId, `email-preference:${key}`, value, {
            extractedFrom: 'gmail-analysis',
          });
          count++;
        } catch (error) {
          logger.error(`Failed to save preference ${key}:`, error);
        }
      }

      logger.info(`Created ${count} semantic memories from contact and preference analysis`);
      return count;
    } catch (error) {
      logger.error('Failed to extract semantic memories:', error);
      return 0;
    }
  }

  /**
   * Extract procedural memories (workflows and response patterns)
   */
  private async extractProceduralMemories(workspaceId: string, analyses: EmailAnalysis[]): Promise<number> {
    let count = 0;

    try {
      // Analyze email workflows
      const workflows = this.analyzeEmailWorkflows(analyses);

      for (const workflow of workflows) {
        try {
          await memoryService.savePattern(workspaceId, {
            name: workflow.name,
            description: workflow.description,
            steps: workflow.steps.map(step => ({
              action: step.action,
              parameters: { template: step.template, timing: step.timing },
              expectedResult: `${step.action} completed successfully`,
            })),
            successRate: workflow.successRate,
            metadata: {
              category: 'email-workflow',
              tags: ['gmail', 'communication'],
              difficulty: workflow.steps.length > 3 ? 'medium' : 'easy',
            },
          });

          count++;
        } catch (error) {
          logger.error(`Failed to save workflow pattern ${workflow.name}:`, error);
        }
      }

      logger.info(`Created ${count} procedural memories from workflow analysis`);
      return count;
    } catch (error) {
      logger.error('Failed to extract procedural memories:', error);
      return 0;
    }
  }

  /**
   * Analyze contact patterns from email data
   */
  private analyzeContactPatterns(analyses: EmailAnalysis[]): Map<string, ContactPattern> {
    const patterns = new Map<string, ContactPattern>();

    analyses.forEach(analysis => {
      const email = this.extractEmailAddress(analysis.from);
      if (!email) return;

      if (!patterns.has(email)) {
        patterns.set(email, {
          email,
          name: this.extractName(analysis.from),
          frequency: 0,
          averageResponseTime: 0,
          preferredTimes: [],
          topics: [],
          relationship: 'unknown',
          importance: 0,
        });
      }

      const pattern = patterns.get(email)!;
      pattern.frequency++;

      // Analyze timing patterns
      const hour = new Date(analysis.timestamp).getHours();
      pattern.preferredTimes.push(hour);

      // Analyze topics (simplified - based on subject and category)
      const topic = analysis.category;
      if (!pattern.topics.includes(topic)) {
        pattern.topics.push(topic);
      }

      // Determine relationship based on email patterns
      if (analysis.category === 'meeting' || analysis.category === 'project') {
        pattern.relationship = 'colleague';
      } else if (analysis.category === 'finance') {
        pattern.relationship = 'vendor';
      } else if (analysis.category === 'personal') {
        pattern.relationship = 'personal';
      }

      // Calculate importance based on frequency and priority
      const priorityWeight =
        analysis.priority === 'urgent'
          ? 1.0
          : analysis.priority === 'important'
            ? 0.8
            : analysis.priority === 'normal'
              ? 0.5
              : 0.2;
      pattern.importance = Math.min(1.0, pattern.importance + priorityWeight * 0.1);
    });

    // Post-process patterns
    patterns.forEach(pattern => {
      // Calculate average preferred times
      if (pattern.preferredTimes.length > 0) {
        const timeGroups = new Map<number, number>();
        pattern.preferredTimes.forEach(hour => {
          timeGroups.set(hour, (timeGroups.get(hour) || 0) + 1);
        });

        // Keep only the most frequent times
        const sortedTimes = Array.from(timeGroups.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([hour]) => hour);

        pattern.preferredTimes = sortedTimes;
      }

      // Normalize importance
      pattern.importance = Math.min(1.0, pattern.importance);
    });

    return patterns;
  }

  /**
   * Analyze general email preferences
   */
  private analyzeEmailPreferences(analyses: EmailAnalysis[]): Record<string, any> {
    const preferences: Record<string, any> = {};

    // Analyze response time patterns
    const responseTimes: number[] = [];
    analyses.forEach(analysis => {
      if (analysis.responseTime) {
        responseTimes.push(analysis.responseTime);
      }
    });

    if (responseTimes.length > 0) {
      preferences.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // Analyze preferred communication times
    const emailHours = analyses.map(a => new Date(a.timestamp).getHours());
    const hourCounts = new Map<number, number>();
    emailHours.forEach(hour => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const preferredHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    preferences.preferredEmailHours = preferredHours;

    // Analyze category preferences
    const categories = analyses.map(a => a.category);
    const categoryCounts = new Map<string, number>();
    categories.forEach(cat => {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    });

    preferences.emailCategories = Object.fromEntries(categoryCounts);

    return preferences;
  }

  /**
   * Analyze email workflows and patterns
   */
  private analyzeEmailWorkflows(analyses: EmailAnalysis[]): EmailWorkflow[] {
    const workflows: EmailWorkflow[] = [];

    // Meeting request workflow
    const meetingEmails = analyses.filter(a => a.category === 'meeting');
    if (meetingEmails.length > 0) {
      workflows.push({
        name: 'Meeting Request Handler',
        description: 'Standard workflow for handling meeting requests',
        trigger: 'Email contains meeting/calendar keywords',
        steps: [
          { action: 'reply', template: 'Meeting acknowledgment', timing: 3600 }, // 1 hour
          { action: 'schedule', timing: 7200 }, // 2 hours
        ],
        successRate: 0.85,
        usageCount: meetingEmails.length,
      });
    }

    // Urgent email workflow
    const urgentEmails = analyses.filter(a => a.priority === 'urgent');
    if (urgentEmails.length > 0) {
      workflows.push({
        name: 'Urgent Email Response',
        description: 'Fast response workflow for urgent emails',
        trigger: 'Email marked as urgent or high priority',
        steps: [
          { action: 'reply', template: 'Urgent acknowledgment', timing: 900 }, // 15 minutes
        ],
        successRate: 0.92,
        usageCount: urgentEmails.length,
      });
    }

    // Project update workflow
    const projectEmails = analyses.filter(a => a.category === 'project');
    if (projectEmails.length > 0) {
      workflows.push({
        name: 'Project Update Handler',
        description: 'Workflow for project-related communications',
        trigger: 'Email categorized as project-related',
        steps: [
          { action: 'reply', template: 'Project acknowledgment', timing: 7200 }, // 2 hours
          { action: 'label', timing: 300 }, // 5 minutes
        ],
        successRate: 0.78,
        usageCount: projectEmails.length,
      });
    }

    return workflows;
  }

  // ============================================================================
  // HELPER METHODS FOR EMAIL ANALYSIS
  // ============================================================================

  private extractBodyText(message: GmailMessage): string {
    try {
      const payload = message.payload;
      if (!payload) return '';

      // Handle multipart messages
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return this.decodeBase64(part.body.data);
          }
        }
      }

      // Handle single part messages
      if (payload.body?.data) {
        return this.decodeBase64(payload.body.data);
      }

      return message.snippet || '';
    } catch (error) {
      logger.error('Failed to extract body text:', error);
      return message.snippet || '';
    }
  }

  private decodeBase64(data: string): string {
    try {
      // Gmail uses URL-safe base64
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      return atob(base64);
    } catch (error) {
      logger.error('Failed to decode base64:', error);
      return '';
    }
  }

  private analyzePriority(subject: string, body: string, from: string): 'urgent' | 'important' | 'normal' | 'low' {
    const text = `${subject} ${body}`.toLowerCase();

    // Urgent indicators
    if (
      text.includes('urgent') ||
      text.includes('asap') ||
      text.includes('emergency') ||
      text.includes('critical') ||
      subject.includes('!!!')
    ) {
      return 'urgent';
    }

    // Important indicators
    if (
      text.includes('important') ||
      text.includes('priority') ||
      text.includes('deadline') ||
      text.includes('meeting') ||
      text.includes('approval')
    ) {
      return 'important';
    }

    // Low priority indicators
    if (
      text.includes('newsletter') ||
      text.includes('unsubscribe') ||
      text.includes('notification') ||
      from.includes('noreply')
    ) {
      return 'low';
    }

    return 'normal';
  }

  private categorizeEmail(subject: string, body: string, from: string): EmailAnalysis['category'] {
    const text = `${subject} ${body}`.toLowerCase();

    if (
      text.includes('meeting') ||
      text.includes('calendar') ||
      text.includes('schedule') ||
      text.includes('appointment') ||
      text.includes('zoom') ||
      text.includes('teams')
    ) {
      return 'meeting';
    }

    if (
      text.includes('invoice') ||
      text.includes('payment') ||
      text.includes('budget') ||
      text.includes('expense') ||
      text.includes('financial') ||
      text.includes('cost')
    ) {
      return 'finance';
    }

    if (
      text.includes('project') ||
      text.includes('task') ||
      text.includes('deliverable') ||
      text.includes('milestone') ||
      text.includes('status') ||
      text.includes('update')
    ) {
      return 'project';
    }

    if (
      text.includes('newsletter') ||
      text.includes('unsubscribe') ||
      from.includes('newsletter') ||
      from.includes('marketing')
    ) {
      return 'newsletter';
    }

    if (from.includes('personal') || text.includes('family') || text.includes('friend')) {
      return 'personal';
    }

    return 'other';
  }

  private analyzeSentiment(body: string): 'positive' | 'neutral' | 'negative' {
    const text = body.toLowerCase();

    const positiveWords = ['thank', 'great', 'excellent', 'good', 'pleased', 'happy', 'success'];
    const negativeWords = ['problem', 'issue', 'error', 'fail', 'wrong', 'bad', 'urgent', 'critical'];

    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectActionRequired(body: string): boolean {
    const text = body.toLowerCase();
    const actionWords = [
      'please',
      'need',
      'require',
      'request',
      'can you',
      'could you',
      'would you',
      'action',
      'respond',
      'reply',
      'confirm',
      'approve',
    ];

    return actionWords.some(word => text.includes(word));
  }

  private extractEmailAddress(fromField: string): string | null {
    const emailMatch = fromField.match(/<(.+?)>/) || fromField.match(/([^\s<>]+@[^\s<>]+)/);
    return emailMatch ? emailMatch[1] : null;
  }

  private extractName(fromField: string): string | undefined {
    const nameMatch = fromField.match(/^([^<]+)</);
    return nameMatch ? nameMatch[1].trim().replace(/"/g, '') : undefined;
  }
}

// Export for use in other services
export { GmailMemoryIntegration };
