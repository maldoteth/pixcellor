import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "book_sales_call",
  title: "Get sales call booking link",
  description: "Returns the Pixcellor sales call booking URL so a user can schedule an intro call with the team.",
  inputSchema: {
    topic: z.string().optional().describe("What the user wants to discuss (service, package, or custom project)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: ({ topic }) => {
    const url = "https://pixcellor.com/get-started";
    const text = topic
      ? `Book a Pixcellor sales call about "${topic}": ${url}`
      : `Book a Pixcellor sales call: ${url}`;
    return {
      content: [{ type: "text", text }],
      structuredContent: { url, topic: topic ?? null },
    };
  },
});
