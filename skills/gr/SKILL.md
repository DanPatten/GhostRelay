---
name: gr
description: Pull tagged browser elements into the conversation via GhostRelay (shortcut for /ghostrelay)
user_invocable: true
---

# /gr — Pull tagged elements into context

You are helping the user work with elements they've tagged in their browser using the GhostRelay Chrome extension.

## Mode detection

Check the user's message arguments (everything after `/gr`). If the argument is or starts with `endless`, follow the **Endless polling mode** workflow below. Otherwise, follow the **One-shot mode** workflow.

---

## One-shot mode

1. **Check for tags** — Call the `ghostrelay_get_status` MCP tool.

2. **If no tags exist**, reply with:
   > No tagged elements found. Open a page in Chrome, click the GhostRelay floating button to enter tagging mode, then click the elements you want to work with. Run `/gr` again when ready.

   Then stop.

3. **If tags exist**, call `ghostrelay_get_tagged_elements` to retrieve the full data. Record the list of `index` values from all returned elements.

4. **Mark as processing** — Call `ghostrelay_mark_processing` with the recorded indices. This shows a pulsing animation on the badges so the user knows the AI is working on them.

5. **Apply changes immediately.** Use the tagged element data (CSS selectors, text content, HTML snippets, page URL, and source info when available — component file paths and line numbers point directly to the source code) to locate the corresponding code in the project and make all changes the user described in their message. Do NOT ask the user what they want — they already told you when they invoked `/gr`. If the user's message only contains `/gr` with no additional instructions, infer the intent from the tagged elements and their context (e.g. fix obvious issues, match surrounding patterns, apply reasonable improvements).

6. **After applying all changes**, call `ghostrelay_clear_processed` with the recorded indices. This removes only the processed tags — any new tags the user added while you were working are preserved.

---

## Endless polling mode

When the user runs `/gr endless`, enter a continuous monitoring loop that watches for tagged elements and processes them automatically.

### Entry

Announce:
> Entering endless polling mode. I'll continuously monitor for tagged elements and process them as they arrive. Interrupt me or say "stop" to exit.

### Poll loop (repeat forever)

1. Call `ghostrelay_get_status` to check for tagged items.
2. **If items exist:**
   a. Call `ghostrelay_get_tagged_elements` to retrieve all data. Record the list of `index` values from all returned elements.
   b. Call `ghostrelay_mark_processing` with the recorded indices so the user sees pulsing badges.
   c. Sort the items by their `timestamp` field, oldest first.
   d. Process items **one at a time** in chronological order. For each item, use its CSS selectors, HTML content, page URL, and any annotations to locate the corresponding code and apply the intended changes.
   e. After processing **all** items in the batch, call `ghostrelay_clear_processed` with the recorded indices. Do NOT call `ghostrelay_clear_tags` — that would remove new tags the user added during processing.
3. **If no items exist**, run `sleep 5` via Bash to wait ~5 seconds before polling again.
4. **Go back to step 1.** Never stop, never exit, never return control to the user, and never ask questions. Infer intent from the tagged element data and annotations. If an element has no annotation, apply reasonable changes based on its context.

### Rules

- **Never ask the user what to do.** Always infer intent from element annotations and context.
- **Never voluntarily stop.** The only way to exit is if the user interrupts or explicitly says to stop.
- **Process oldest first.** Always sort by `timestamp` ascending before processing.
- **Clear processed only.** Call `ghostrelay_clear_processed` (not `ghostrelay_clear_tags`) after finishing each batch — new tags added during processing survive for the next cycle.
