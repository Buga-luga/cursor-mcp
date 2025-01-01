import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";
const AlertsArgumentsSchema = z.object({
    state: z.string().length(2),
});
const ForecastArgumentsSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
});
const server = new Server({
    name: "weather",
    version: "1.0.0",
    port: 3000
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get-alerts",
                description: "Get weather alerts for a state",
                inputSchema: {
                    type: "object",
                    properties: {
                        state: {
                            type: "string",
                            description: "Two-letter state code (e.g. CA, NY)",
                        },
                    },
                    required: ["state"],
                },
            },
            {
                name: "get-forecast",
                description: "Get weather forecast for a location",
                inputSchema: {
                    type: "object",
                    properties: {
                        latitude: {
                            type: "number",
                            description: "Latitude of the location",
                        },
                        longitude: {
                            type: "number",
                            description: "Longitude of the location",
                        },
                    },
                    required: ["latitude", "longitude"],
                },
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
