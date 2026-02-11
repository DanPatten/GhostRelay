import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { store } from "./store.js";

export function registerTools(server: McpServer) {
  server.tool(
    "get_tagged_elements",
    "Get all tagged elements from the Chrome extension. Returns array of elements with CSS selectors, text content, HTML, bounding boxes, and page URLs.",
    {},
    async () => {
      const tags = store.getAllTags();
      const context = store.getAllContext();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ tags, context }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "clear_tags",
    "Clear all tagged elements and notify the Chrome extension to remove badges.",
    {},
    async () => {
      store.clear();
      return {
        content: [
          {
            type: "text" as const,
            text: "All tags cleared. Chrome extension has been notified.",
          },
        ],
      };
    }
  );

  server.tool(
    "get_status",
    "Get the current tagging status: count of tagged elements and which page URLs have tags.",
    {},
    async () => {
      const count = store.getTagCount();
      const urls = store.getPageURLs();
      const context = store.getAllContext();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count, urls, context }, null, 2),
          },
        ],
      };
    }
  );
}
