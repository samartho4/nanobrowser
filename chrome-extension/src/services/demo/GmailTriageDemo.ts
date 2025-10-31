/**
 * Gmail Triage Demo Service
 * Provides demo-ready responses for the showcase
 */

export interface DemoEmailData {
  id: string;
  from: string;
  subject: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  threadLength: number;
  responseTime: number; // hours since received
  category: 'client' | 'internal' | 'marketing' | 'finance';
}

export interface DemoTriageResult {
  analysis: string;
  recommendations: string[];
  timeEstimate: number;
  tokensSaved: number;
  actionsPlanned: string[];
}

export class GmailTriageDemo {
  private demoEmails: DemoEmailData[] = [
    {
      id: 'email_1',
      from: 'John Smith (CEO)',
      subject: 'Q4 Budget Review - Urgent Decision Needed',
      priority: 'urgent',
      threadLength: 1,
      responseTime: 3,
      category: 'finance',
    },
    {
      id: 'email_2',
      from: 'Client X',
      subject: 'Project Timeline Concerns',
      priority: 'high',
      threadLength: 4,
      responseTime: 6,
      category: 'client',
    },
    {
      id: 'email_3',
      from: 'Marketing Team',
      subject: 'Campaign Budget Approval',
      priority: 'high',
      threadLength: 15,
      responseTime: 12,
      category: 'marketing',
    },
    {
      id: 'email_4',
      from: 'HR Department',
      subject: 'Team Meeting Reschedule',
      priority: 'medium',
      threadLength: 3,
      responseTime: 24,
      category: 'internal',
    },
    {
      id: 'email_5',
      from: 'finance@company.com',
      subject: 'Monthly Expense Report',
      priority: 'medium',
      threadLength: 1,
      responseTime: 8,
      category: 'finance',
    },
  ];

  /**
   * Generate demo triage analysis
   */
  generateTriageAnalysis(): DemoTriageResult {
    const urgentEmails = this.demoEmails.filter(e => e.priority === 'urgent').length;
    const overdueEmails = this.demoEmails.filter(e => e.responseTime > 4).length;
    const longThreads = this.demoEmails.filter(e => e.threadLength > 10).length;

    const analysis = `📧 **Email Triage Analysis:**

🔥 **URGENT** (${urgentEmails} emails):
• ${this.demoEmails[0].from} - "${this.demoEmails[0].subject}"
  → Blocks 2 other tasks, respond first

⏰ **TIME-SENSITIVE** (${overdueEmails} emails):
• ${this.demoEmails[1].from} - "${this.demoEmails[1].subject}"  
  → You usually reply within 2 hours, it's been ${this.demoEmails[1].responseTime} hours

📋 **THREAD SUMMARY**:
• ${this.demoEmails[2].subject} (${this.demoEmails[2].threadLength} messages)
  → Decision needed: Budget approval for $50K spend

💡 **SMART RECOMMENDATIONS:**
You have 1 hour free today. I suggest:
1. Respond to John Smith first (5 min) - **Highest Impact**
2. Quick reply to Client X (10 min) - **Overdue Pattern**  
3. Schedule meeting for marketing decision (5 min) - **Complex Thread**

🧠 **Memory Insight:** Based on your patterns, you handle finance emails before 10am. Should I prioritize the budget items?`;

    const recommendations = [
      'Respond to CEO email first (blocks other tasks)',
      'Quick reply to overdue client email',
      'Schedule meeting for complex marketing thread',
      'Batch process remaining internal emails',
      'Set reminder for finance deadline',
    ];

    const actionsPlanned = [
      'Draft response to John Smith about Q4 budget',
      'Send quick status update to Client X',
      'Create calendar invite for marketing budget meeting',
      'Mark HR email for batch processing',
      'Set calendar reminder for finance report deadline',
    ];

    return {
      analysis,
      recommendations,
      timeEstimate: 20, // minutes
      tokensSaved: 1424, // tokens saved through compression
      actionsPlanned,
    };
  }

  /**
   * Generate memory learning responses for different time periods
   */
  getMemoryLearningResponse(timeframe: 'first' | 'second_day' | 'week_later'): string {
    switch (timeframe) {
      case 'first':
        return `🧠 **First Time Analysis** (30 seconds):
• Analyzing email patterns...
• Learning your response preferences...  
• Building priority models...
• Identifying key contacts and their importance...

📊 **Initial Patterns Detected:**
• Response time: 2-4 hours average
• Priority: CEO > Clients > Internal > Marketing
• Schedule: Finance emails handled before 10am`;

      case 'second_day':
        return `🧠 **Memory Recall** (Day 2):
"I remember you always mark emails from finance@company.com as important. Should I prioritize these based on your established pattern?"

📈 **Learning Progress:**
• Pattern confidence: 78%
• Response prediction accuracy: 85%
• Priority classification: 92%`;

      case 'week_later':
        return `🧠 **Advanced Learning** (Week Later):
"Based on last week's pattern, you handle finance emails before 10am. I've prioritized them accordingly."

🎯 **Mastered Patterns:**
• Response timing: 95% accuracy
• Priority prediction: 97% accuracy  
• Workflow optimization: 89% efficiency gain
• Personalization score: 94%`;

      default:
        return 'Learning in progress...';
    }
  }

  /**
   * Get demo metrics for before/after comparison
   */
  getDemoMetrics() {
    return {
      traditional: {
        tokens: 45000,
        timeMinutes: 15,
        accuracy: 60,
        learning: false,
        personalization: 20,
      },
      shannon: {
        tokens: 12000,
        timeMinutes: 3,
        accuracy: 95,
        learning: true,
        personalization: 94,
        improvement: 73, // percentage improvement
      },
    };
  }
}

export const gmailTriageDemo = new GmailTriageDemo();
