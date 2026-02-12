---
name: ghostrelay
description: Pull tagged browser elements into the conversation via GhostRelay
user_invocable: true
---

# /ghostrelay — Pull tagged elements into context

You are helping the user work with elements they've tagged in their browser using the GhostRelay Chrome extension.

## Steps

1. **Check for tags** — Call the `ghostrelay_get_status` MCP tool.

2. **If no tags exist**, reply with:
   > No tagged elements found. Open a page in Chrome, click the GhostRelay floating button to enter tagging mode, then click the elements you want to work with. Run `/ghostrelay` again when ready.

   Then stop.

3. **If tags exist**, call `ghostrelay_get_tagged_elements` to retrieve the full data.

4. **Apply changes immediately.** Use the tagged element data (CSS selectors, text content, HTML snippets, page URL) to locate the corresponding code in the project and make all changes the user described in their message. Do NOT ask the user what they want — they already told you when they invoked `/ghostrelay`. If the user's message only contains `/ghostrelay` with no additional instructions, infer the intent from the tagged elements and their context (e.g. fix obvious issues, match surrounding patterns, apply reasonable improvements).

5. **After applying all changes**, call `ghostrelay_clear_tags` to clean up the tags from the browser and server.
