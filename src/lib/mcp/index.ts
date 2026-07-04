import { defineMcp } from "@lovable.dev/mcp-js";
import listServicesTool from "./tools/list-services";
import listPackagesTool from "./tools/list-packages";
import bookSalesCallTool from "./tools/book-sales-call";

export default defineMcp({
  name: "pixcellor-mcp",
  title: "Pixcellor",
  version: "0.1.0",
  instructions:
    "Pixcellor is an AI-powered agency building marketing, tech, and business solutions. Use `list_services` to browse the service catalogue, `list_packages` to see standard build/retainer pricing, and `book_sales_call` to get the booking link when a user is ready to talk.",
  tools: [listServicesTool, listPackagesTool, bookSalesCallTool],
});
