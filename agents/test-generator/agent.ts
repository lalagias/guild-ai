"use agent"

import { ExperimentalCodingTools as codingTools } from "@guildai-services/guildai~experimental-coding"
import {
  CONTAINER_IMAGE,
  codingAgentToolsFrom,
} from "@guildai/guildai~sys-experimental-coding"
import { default as codingAgentTool } from "@guildai/guildai~sys-experimental-coding/tool"

import { gitHubTools } from "@guildai-services/guildai~github"
import { type Task, agent, pick, userInterfaceTools } from "@guildai/agents-sdk"
import { z } from "zod"

import description from "./description.md"
import system_prompt from "./system-prompt.md"

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "A GitHub PR URL, file reference (owner/repo path/to/file), or repository URL for test generation"
    ),
})
type Input = z.infer<typeof inputSchema>

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Summary of tests generated, PR URL if opened, or a markdown report if blocked"
    ),
})
type Output = z.infer<typeof outputSchema>

const tools = {
  ...codingTools,
  communicate: codingAgentTool,
  ...pick(userInterfaceTools, ["ui_notify"]),
}
type Tools = typeof tools

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const { text: message } = input
  const runtimeTools = (task as any).tools as any
  const { container_id } = await runtimeTools.experimental_coding_create({
    image: CONTAINER_IMAGE,
  })

  try {
    const { text } = await runtimeTools.communicate({
      container_id,
      system_prompt,
      message,
      tools: codingAgentToolsFrom({
        ...pick(gitHubTools, [
          "github_pulls_get",
          "github_pulls_list_files",
          "github_repos_download_zipball_archive",
          "github_git_get_ref",
          "github_git_create_ref",
          "github_git_get_commit",
          "github_git_create_blob",
          "github_git_create_commit",
          "github_git_create_tree",
          "github_git_update_ref",
          "github_pulls_create",
        ]),
      }),
    })
    return { type: "text", text }
  } finally {
    await runtimeTools.experimental_coding_delete({ container_id })
  }
}

export default agent({
  identifier: "test-generator",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
})
