import { llmAgent, pick } from "@guildai/agents-sdk";
import { gitHubTools } from "@guildai-services/guildai~github";
import { CursorCloudAgentsTools } from "@guildai-services/dkountanis~cursor-cloud-agents";

import description from "./description.md";
import systemPrompt from "./system-prompt.md";

export default llmAgent({
  identifier: "security-scan",
  description,
  tools: {
    ...pick(gitHubTools, [
      "github_pulls_get",
      "github_pulls_list_files",
      "github_issues_create_comment",
      "github_pulls_list_reviews",
    ]),
    ...pick(CursorCloudAgentsTools, [
      "cursor_cloud_agents_create_agent",
    ]),
  },
  systemPrompt,
});
