import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "tagrelay",
    {
      title: "TagRelay Workflow",
      description:
        "Pull tagged browser elements into context and apply changes. Use after tagging elements with the TagRelay Chrome extension. Optionally pass a context argument describing what should change.",
      argsSchema: {
        context: z
          .string()
          .optional()
          .describe(
            "What the user wants done with the tagged elements (e.g., 'make the header blue')"
          ),
      },
    },
    async ({ context }) => {
      const contextLines: string[] = [];

      if (context) {
        contextLines.push(
          "",
          "## User Instructions (from prompt argument)",
          `The user wants you to: **${context}**`,
          "Apply these instructions to the tagged elements."
        );
      } else {
        contextLines.push(
          "",
          "## Context",
          "No instructions were provided as a prompt argument. Check the tool response from `get_tagged_elements` for a `context` field — the user may have typed instructions in the Chrome extension toolbar. If neither source has context, ask the user what they want done with the tagged elements."
        );
      }

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "You have access to TagRelay MCP tools that let you work with elements the user has tagged in their browser.",
                "",
                "## Tools",
                "- `get_status` — Check how many elements are tagged and on which pages. Also returns any context the user provided in the extension.",
                "- `get_tagged_elements` — Get full data for each tagged element: CSS selector, text content, HTML snippet, bounding box, page URL, and any context the user provided.",
                "- `clear_tags` — Clear all tags from the browser and server.",
                ...contextLines,
                "",
                "## Workflow",
                "1. Call `get_status` to check for tags.",
                "2. If no tags exist, tell the user to open a page in Chrome, click the TagRelay floating button to enter tagging mode, and click the elements they want to work with.",
                "3. If tags exist, call `get_tagged_elements` to retrieve the full data.",
                "4. Apply changes immediately. Use the tagged element data (CSS selectors, text content, HTML snippets, page URL) to locate the corresponding code in the project and make all changes the user described. If no specific instructions were given, infer the intent from the tagged elements and their context.",
                "5. After applying all changes, call `clear_tags` to clean up.",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );
}
