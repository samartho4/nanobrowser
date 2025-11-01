# Shannon - Your Browser's Brain 🧠

*Named after Claude Shannon, the father of information theory*

**A Chrome extension that gives your browser a brain - remembering, compressing, and recalling context locally so your AI tools don't start every task with amnesia.**

---

## 🎯 Inspiration

Every AI agent starts from zero - intelligent, but forgetful. We were tired of re-explaining context, switching tabs, and losing track of what mattered while working across different tools like Gmail, Calendar, Drive etc. That's why we built Shannon - a Chrome extension that gives your browser a brain. 

Named after the father of information theory, Shannon gives the ability for users to have more control as complexity increases with multi-agent system's interaction over various web automation tasks. It remembers, compresses, and recalls context locally so your tools don't start every task with amnesia.

## 🚀 What it does

Just as Claude Shannon once taught machines to compress information without losing meaning, Shannon does the same for your digital world - it turns your browser into a personal cognitive workspace. 

Each workspace has its own memory - it learns from your agentic actions, stores relevant context, and compresses information by harnessing context window. You can see, select, and edit what your AI knows in real time, unlike Atlas or Comet. Thus, with isolated workspace you get fine tuned LLM agents on the fly without fine tuning LLM. 

As it is powered by **Gemini Nano** with Chrome's built-in **Prompt API**, so everything runs privately and instantly on-device.

## 🛠️ How we built it

Shannon is built as a Chrome extension with a simple goal: act like an on-device teammate that understands what you're doing. We power the Gemini Nano with Chrome DevTools Protocol, so the multi-agent system can run locally. 

With built in prompt api, context engineering starts by classifying from episodic sessions, semantic facts, and procedural workflows. Doing so makes agents faster, especially navigator agent whereas planner agent retrieves context safely on the client side. 

Our memory system is inspired by mirroring how people actually work. Each workspace keeps:
- **Short-term steps** (episodic memory)
- **Important facts and preferences** (semantic memory)  
- **Reusable workflows** (procedural memory) isolated

The system runs on four pillars of local context engineering: **write, select, compress, isolate**, making Shannon powerful without needing fine-tuning.

We also tested with hybrid firebase and found out that Planner agent figures better on 2.5 pro on what needs to happen next whereas a Navigator agent is more suitable in Nano and also 2.5 Gemini flash which interacts with the page. The Executor writes results back into memory so Shannon keeps learning and improves over time.

## 💪 Challenges we ran into

Building Shannon pushed us to solve a series of technical and architectural challenges:

### Multi Agent Interoperability
We encountered unexpected inconsistency between Gemini Nano and our fallback agents particularly in how they returned JSON. Gemini responses via Firebase often wrapped content inside additional layers, breaking our original JSON extraction logic. This led to common failures like the Navigator reporting "not exists" for basic actions (e.g., scroll_page, refresh_page). To solve this, we had to implement a more robust, adaptive JSON parser that could gracefully handle multiple schema variants.

### Debugging Across Chrome Contexts
The chrome.debugger API only supports attaching to one page at a time, which severely limited parallel debugging. To overcome this, we leverage a Puppeteer-inspired abstraction layer. It uses a custom ExtensionTransport over CDP and simulates BrowserContext and Page objects inside the extension. This allowed us to implement over 20 stable actions (e.g., click, scroll_to_text, extract_text, screenshot) that operate reliably from within content scripts — enabling multimodal interaction with the live DOM.

### Isolated Context Memory for Workspaces
When integrating with Gmail and other apps, we observed "context bleed" between user sessions where procedural, semantic, and episodic memory crossed workspace boundaries. This broke personalization and led to inconsistent responses. To fix this, we namespaced all stored memory using a workspaceId on every key. This way the context remains cleanly separated across user workspaces, enabling reliable, session-specific recall.

## 🏆 Accomplishments that we're proud of

• **Building a zero-latency, zero-cost agentic system**: Our multi-agent setup runs complex web workflows fully client-side making it instant, private and free from API costs.

• **Making context visible and controllable**: We let users see, and edit context with source tags, token counts, and drag-and-drop. This enables real-time fine-tuning without touching model weights.

• **Creating a fully configurable cognitive workspace**: Every agent, model, tool, and workspace is customizable. Unlike black-box browsers like Atlas or Comet, Shannon adapts to you (the user) not the other way around which feels like a personal cognitive workspace.

## 📚 What we learned

Our biggest learning while building Shannon was that the key to harnessing context isn't more power, it's more control. Turning black-box agents into stateful, user-tunable systems helped us control information complexity and get the most out of lightweight models like Gemini Nano. 

With Prompt API support for writing, selecting, compressing, and isolating context, we found Nano to be surprisingly powerful when paired with the right context engineering. We also learned that settings are more than preferences, they're an inventory. Users could easily tune agents via autonomy sliders and we found that Navigator agents are actually better on Gemini nano and Gemini 2.5 flash. 

Finally, we removed the Validator agent. It slowed us down, burned tokens, and didn't help. Plan-and-Act just works and the latest research papers (https://arxiv.org/pdf/2503.09572) backs it up.

## 🔮 What's next for Shannon

The future of Shannon is building towards a more intelligent and private-first agentic workspace. Here's what we are doing going forward:

**Smarter Memory**: Explore Dexie.js (IndexedDB) and Neo4j to power Shannon's semantic memory and context-aware knowledge graphs.

**Event-Driven Agents**: Leverage chrome.alarms and ambient agents to introduce an event-driven architecture, enabling proactive classification, notifications, and scheduled automation.

**Virtualized Workspaces**: Implement a virtual file system with native shell-like commands (ls, read_file, write_file) to give each workspace an isolated, persistent memory layer.

**Parallel Execution**: Launch multiple subagents (e.g., @Research, @Writer, @Calendar) to run concurrently with tagged outputs and safe task-specific parallelism.

**Deeper Integrations**: Build richer adapters for Google Workspace (Drive, Calendar, Gmail), with optional MCP connectors and strict approval flows for trust and transparency.

**Smarter @Mentions**: Expand Shannon's capabilities behind @-mentions, enabling access to tools (like @Drive, @Calendar) on a per-workspace basis with granular policies.

**Benchmarking the Edge**: Measure latency and accuracy across on-device vs. cloud LLMs tuning fallback logic based on real-world deltas.

**Privacy by Design**: Go beyond local compute with URL firewalls, approval prompts, and audit trail so Shannon stays private, secure, and fully in user's control.

## 🛠️ Built With

- **browser-use**
- **chrome-devtools-protocol-(cdp)**
- **chrome-extension-api**
- **chrome.storage**
- **firebase**
- **langchain**
- **pnpm**
- **puppeteer**
- **turborepo**
- **typescript**

---

*Shannon - Because your browser deserves a brain as smart as you are.*
