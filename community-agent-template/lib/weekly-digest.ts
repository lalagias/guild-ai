import { getSlackClient } from "./slack";
import { channels } from "./channels";

interface DigestStats {
  totalMessages: number;
  activeChannels: string[];
  topContributors: string[];
  unansweredThreads: number;
  newMembers: number;
}

export async function generateWeeklyDigest(): Promise<string> {
  const stats = await gatherStats();
  return formatDigest(stats);
}

async function gatherStats(): Promise<DigestStats> {
  const slack = await getSlackClient();
  const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

  let totalMessages = 0;
  const activeChannels: string[] = [];

  for (const channel of Object.values(channels)) {
    try {
      const history = await slack.conversations.history({
        channel: channel.name,
        oldest: String(oneWeekAgo),
        limit: 100,
      });
      const count = history.messages?.length ?? 0;
      totalMessages += count;
      if (count > 0) {
        activeChannels.push(`#${channel.name} (${count})`);
      }
    } catch {
      // channel may not be accessible
    }
  }

  return {
    totalMessages,
    activeChannels,
    topContributors: [],
    unansweredThreads: 0,
    newMembers: 0,
  };
}

function formatDigest(stats: DigestStats): string {
  const lines = [
    `*Weekly Community Digest*`,
    ``,
    `Messages this week: ${stats.totalMessages}`,
    `Active channels: ${stats.activeChannels.join(", ") || "none"}`,
  ];

  if (stats.newMembers > 0) {
    lines.push(`New members: ${stats.newMembers}`);
  }

  if (stats.unansweredThreads > 0) {
    lines.push(`Unanswered threads: ${stats.unansweredThreads}`);
  }

  return lines.join("\n");
}
