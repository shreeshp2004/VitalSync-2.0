import { redis } from '../config/redis.js';
import { ECGWatchAgent, FallDetectAgent, HRVCoachAgent,
         EnvironmentAgent, RiskScorerAgent, TrendAnalystAgent } from './agents.js';
import logger from '../utils/logger.js';

class AgentRunner {
  constructor() {
    this.agents = [
      new ECGWatchAgent(),
      new FallDetectAgent(),
      new HRVCoachAgent(),
      new EnvironmentAgent(),
      new RiskScorerAgent(),
    ];
    this.subscriber = null;
  }

  async start() {
    // Subscribe using a separate Redis connection
    this.subscriber = redis.duplicate();
    await this.subscriber.connect();

    await this.subscriber.subscribe('vitals:new', (message) => {
      const data = JSON.parse(message);
      this.agents.forEach(agent => agent.evaluate(data).catch(err => {
        logger.error({ agent: agent.name, err }, 'Agent evaluate error');
      }));
    });

    // Schedule TrendAnalystAgent nightly at 23:55
    this.#scheduleTrendAnalyst();

    logger.info(`🤖 AgentRunner started — ${this.agents.length} agents active`);
  }

  // Called from ingest controller after ML results come back
  async dispatch(user_id, device_id, vitals, mlResult) {
    const payload = { user_id, device_id, ...vitals, ml: mlResult };
    await Promise.allSettled(
      this.agents.map(agent => agent.evaluate(payload))
    );
  }

  #scheduleTrendAnalyst() {
    const analyst = new TrendAnalystAgent();
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(23, 55, 0, 0);
    if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);

    const delay = nextRun - now;
    setTimeout(() => {
      analyst.runNightly();
      setInterval(() => analyst.runNightly(), 24 * 60 * 60 * 1000);
    }, delay);

    logger.info(`TrendAnalystAgent scheduled in ${Math.round(delay / 60000)} minutes`);
  }
}

export const agentRunner = new AgentRunner();
