import { headers } from "next/headers";
import { cache } from "react";
import { mockActions, mockConversations } from "@/data/mock/activity";
import { auth, isCurrentUserLead } from "@/lib/auth";
import {
  getLastSeen,
  getThreadKeyForAction,
  isStoreConfigured,
  getActionById as storeGetActionById,
  getConversation as storeGetConversation,
  getRecentActions as storeGetRecentActions,
  getStats as storeGetStats,
} from "@/lib/store";
import type {
  AnalyticsBucket,
  AnalyticsData,
  BotAction,
  ConversationDetail,
  ConversationMessage,
  DashboardStats,
} from "@/lib/types";
import { requireSession } from "./auth";

const LEADING_HASH_RE = /^#/;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const getRecentActions = cache(async (): Promise<BotAction[]> => {
  await requireSession();
  if (!isStoreConfigured()) {
    await delay(2000);
    return [...mockActions].sort(
      (a, b) => (b.lastUpdated ?? b.timestamp) - (a.lastUpdated ?? a.timestamp)
    );
  }
  return storeGetRecentActions(500);
});

export const getActionById = cache(
  async (id: string): Promise<BotAction | null> => {
    await requireSession();
    if (!isStoreConfigured()) {
      await delay(500);
      return mockActions.find((a) => a.id === id) ?? null;
    }
    return storeGetActionById(id);
  }
);

export const getConversation = cache(
  async (actionId: string): Promise<ConversationMessage[]> => {
    await requireSession();
    if (!isStoreConfigured()) {
      await delay(500);
      return mockConversations[actionId] || [];
    }
    return storeGetConversation(actionId);
  }
);

export const getConversationDetail = cache(
  async (actionId: string): Promise<ConversationDetail | null> => {
    await requireSession();

    const action = await getActionById(actionId);
    if (!action) {
      return null;
    }

    const isDM = action.channel === "DM";
    const [canViewDM, threadKey] = await Promise.all([
      isDM ? isCurrentUserLead() : true,
      getThreadKeyForAction(actionId),
    ]);

    const messages = canViewDM ? await getConversation(actionId) : [];

    return { action, messages, threadKey, dmRestricted: isDM && !canViewDM };
  }
);

async function fetchAnalyticsData(): Promise<AnalyticsData> {
  let actions: BotAction[];
  if (isStoreConfigured()) {
    actions = await storeGetRecentActions(500);
  } else {
    actions = [...mockActions].sort(
      (a, b) => (b.lastUpdated ?? b.timestamp) - (a.lastUpdated ?? a.timestamp)
    );
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  function startOfDay(ts: number) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  const todayStart = startOfDay(now);
  const earliest =
    actions.length > 0 ? Math.min(...actions.map((a) => a.timestamp)) : now;
  const earliestDayStart = startOfDay(earliest);
  const spanDays = Math.max(
    Math.round((todayStart - earliestDayStart) / dayMs) + 1,
    2
  );

  const buckets: AnalyticsBucket[] = [];

  for (let i = 0; i < spanDays; i++) {
    const d = new Date(earliestDayStart + i * dayMs);
    buckets.push({
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      answered: 0,
      routed: 0,
      welcomed: 0,
      surfaced: 0,
      flagged: 0,
    });
  }

  const typeCounts: Record<string, number> = {};

  for (const action of actions) {
    typeCounts[action.type] = (typeCounts[action.type] || 0) + 1;

    const actionDayStart = startOfDay(action.timestamp);
    const idx = Math.round((actionDayStart - earliestDayStart) / dayMs);
    if (idx >= 0 && idx < spanDays) {
      buckets[idx][action.type]++;
    }
  }

  return { buckets, typeCounts, totalActions: actions.length };
}

export const getAnalyticsData = cache(async (): Promise<AnalyticsData> => {
  await requireSession();
  return fetchAnalyticsData();
});

export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  const [actions, stats] = await Promise.all([
    getRecentActions(),
    storeGetStats(),
  ]);

  const counts: Record<string, number> = { ...stats };
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek: Record<string, number> = { total: 0 };

  for (const action of actions) {
    if (action.timestamp >= weekAgo) {
      thisWeek[action.type] = (thisWeek[action.type] || 0) + 1;
      thisWeek.total++;
    }
  }

  return { counts, thisWeek };
});

export const getActionCounts = cache(
  async (): Promise<Record<string, number>> => {
    await requireSession();
    const stats = await storeGetStats();
    return {
      all: stats.total,
      answered: stats.answered,
      routed: stats.routed,
      welcomed: stats.welcomed,
      surfaced: stats.surfaced,
      flagged: stats.flagged,
    };
  }
);

export const getChannelCounts = cache(
  async (): Promise<Record<string, number>> => {
    await requireSession();
    if (!isStoreConfigured()) {
      const counts: Record<string, number> = {};
      for (const action of mockActions) {
        if (action.channel) {
          const name = action.channel.replace(LEADING_HASH_RE, "");
          counts[name] = (counts[name] || 0) + 1;
        }
      }
      return counts;
    }
    const actions = await storeGetRecentActions(500);
    const counts: Record<string, number> = {};
    for (const action of actions) {
      if (action.channel) {
        const name = action.channel.replace(LEADING_HASH_RE, "");
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return counts;
  }
);

export const getLastSeenTimestamp = cache(async (): Promise<number> => {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (!session?.user?.id) {
    return 0;
  }
  return getLastSeen(session.user.id);
});
