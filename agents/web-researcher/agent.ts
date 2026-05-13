import {
  llmAgent,
  pick,
  guildTools,
  consoleTools,
  userInterfaceTools,
} from "@guildai/agents-sdk";
import { FirecrawlTools } from "@guildai-services/dkountanis~firecrawl";

import description from "./description.md";
import systemPrompt from "./system-prompt.md";

export default llmAgent({
  identifier: "web-researcher",
  description,
  tools: {
    ...pick(FirecrawlTools, [
      // Scrape
      "firecrawl_scrape_and_extract_from_url",
      "firecrawl_search_and_scrape",
      "firecrawl_map_urls",
      // Crawl
      "firecrawl_crawl_urls",
      "firecrawl_get_crawl_status",
      "firecrawl_cancel_crawl",
      "firecrawl_get_active_crawls",
      "firecrawl_crawl_params_preview",
      "firecrawl_get_crawl_errors",
      // Batch
      "firecrawl_scrape_and_extract_from_urls",
      "firecrawl_get_batch_scrape_status",
      "firecrawl_cancel_batch_scrape",
      "firecrawl_get_batch_scrape_errors",
      // Extract
      "firecrawl_extract_data",
      "firecrawl_get_extract_status",
      // Agent (fire-1)
      "firecrawl_start_agent",
      "firecrawl_get_agent_status",
      "firecrawl_cancel_agent",
      // Browser
      "firecrawl_create_browser_session",
      "firecrawl_list_browser_sessions",
      "firecrawl_execute_browser_code",
      "firecrawl_delete_browser_session",
      // Interact (scrape-bound)
      "firecrawl_interact_with_scrape_browser_session",
      "firecrawl_stop_interactive_scrape_browser_session",
      // Usage & support
      "firecrawl_get_credit_usage",
      "firecrawl_get_historical_credit_usage",
      "firecrawl_get_token_usage",
      "firecrawl_get_historical_token_usage",
      "firecrawl_get_activity",
      "firecrawl_get_queue_status",
      "firecrawl_support_ask",
      "firecrawl_support_docs_search",
    ]),
    ...guildTools,
    ...consoleTools,
    ...pick(userInterfaceTools, ["ui_notify"]),
  },
  systemPrompt,
  mode: "multi-turn",
});
