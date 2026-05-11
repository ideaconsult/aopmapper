---
layout: "layouts/simple.njk"
eleventyExcludeFromCollections: true
permalink: "/aop/mcp.html"
title: "AOP Mapper MCP"
description: "Connect AOP Mapper to AI assistants via MCP"
date: Last Modified
container_type: container
logoUri: "/assets/img/logo-aopmapper.svg"
logoHref: "/aop"
---

# AOP Mapper MCP

The AOP Mapper exposes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that lets AI assistants — Mistral's Le Chat, Claude, ChatGPT, and any other MCP-compatible client — query AOP-Wiki data directly during a conversation.

**MCP endpoint:** `https://mcp.aop.adma.ai/mcp`

---

## What is MCP?

MCP is an open standard that allows AI assistants to call external tools during a conversation. Instead of relying on the model's training data, the assistant queries live, structured knowledge and incorporates the results into its answer. For AOP-Wiki this means the assistant can retrieve current pathway data, key event details, and assay information without hallucinating IDs or structures.

---

## Connecting to Mistral's Le Chat

### Configuration

1. Open [Mistral's Le Chat](https://chat.mistral.ai/) and sign in
2. From the left panel, select **Intelligence** (the four-pointed star if the panel is closed)
3. Select **Connectors** from the *Intelligence* options
4. From the main panel, choose **+ Add Connector**
5. Switch to **Custom MCP Connector** in the modal window
6. Enter `AOPMapper` for **Connector Title**
7. Enter `https://mcp.aop.adma.ai/mcp` for **Connector Server**
8. Leave `No Authentication` selected for **Authentication Method**
9. Double-check steps 6-8 and click **Connect**

### Chat use

1. Open a new chat
2. Click the `+` button below the chat.
3. Select **Connectors**
4. Select `AOPMapper` from the list (if necessary, search for it).
5. When activated properly, an intersecting circles button will appear below the chat.
6. Ask your question. If Le Chat used the tool, there will be an expandable box above the reply.

## Connecting to Claude

### Claude.ai (web)

1. Open [claude.ai](https://claude.ai) and sign in
2. Go to **Settings → Connectors**
3. Click **Add custom connector**
4. Enter name: AOPMapper, the Remote MCP Server URL: `https://mcp.aop.adma.ai/mcp`
5. Save — the AOPMapper tools are now available in all conversations

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aop-mapper": {
      "url": "https://mcp.aop.adma.ai/mcp"
    }
  }
}
```

The config file is located at:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop after saving.

---

## Connecting to ChatGPT

Connecting to a custom MCP server in ChatGPT requires **Developer Mode**.

> **Note:** As of December 2025, ChatGPT renamed "Connectors" to **Apps**. The steps below use the current terminology.

### Step 1 — Enable Developer Mode

1. Open [chatgpt.com](https://chatgpt.com) and sign in
2. Go to **Settings → Apps → Advanced settings**
3. Toggle on **Developer Mode**

### Step 2 — Create an app

1. In **Settings → Apps**, click **Create**
2. Fill in:
   - **Name:** `AOP Mapper`
   - **Description:** `Query AOP-Wiki pathways, key events, and assays`
   - **Connector URL:** `https://mcp.aop.adma.ai/mcp`
3. Click **Create** — ChatGPT will connect and display the available tools

### Step 3 — Use it in a chat

1. Start a new chat
2. Click the **+** icon in the message composer and select **More**
3. Choose **Developer mode**
4. Select **AOP Mapper** as a source for this conversation
5. Ask your question — ChatGPT will propose tool calls and ask for confirmation before executing

> **Note:** Each tool call requires manual confirmation. This is a ChatGPT safety requirement for all custom apps.

---

## Connecting to other clients

Any MCP-compatible client can connect using the endpoint URL:

```
https://mcp.aop.adma.ai/mcp
```

The server uses the **Streamable HTTP** transport (MCP 2025-03-26 spec), which is supported by all current MCP clients. No authentication is required.

---

## Available tools

### `aop_search`

Search AOPs by keyword. Returns a ranked list of matching pathways.

**When to use:** start here when you have a toxicological endpoint, organ, or process and want to find relevant AOPs.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `query` | string | Search term, e.g. `oxidative stress`, `pulmonary fibrosis`, `liver steatosis` |
| `top_n` | integer | Maximum results to return (1–50, default 10) |

**Example prompt:**
> "Which AOPs are relevant to pulmonary toxicity from inhaled nanomaterials?"

---

### `aop_get_aop`

Get the full structure of one AOP — MIE, intermediate key events, adverse outcome, and all key event relationships.

**When to use:** once you have an AOP ID and want the complete pathway chain with biological descriptions and assay information for each step.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `aop_id` | string | AOP ID, e.g. `AOP173`, `AOP144` |

**Example prompt:**
> "Give me the full structure of AOP173 — what is the MIE, what are the key events in order, what is the adverse outcome, and what assays can measure each step?"

---

### `aop_get_key_event`

Get detailed information about a specific Key Event.

**When to use:** when you want the biological description, organisation level, upstream/downstream connections, and assays for a single KE.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `ke_id` | string | Key Event ID, e.g. `KE1392`, `KE887` |

**Example prompt:**
> "What is KE1392? What does it connect to upstream and downstream, and how can it be measured?"

---

### `aop_get_ker`

Get the details of a Key Event Relationship — which KE leads to which.

**When to use:** when you want to understand a specific causal link between two key events.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `ke_id` | string | KER ID, e.g. `KER1702`, `KER1702` |

**Example prompt:**
> "Explain KER1702 — what is the upstream event, what is the downstream event, and what is the biological basis of the relationship?"

---

### `aop_find_by_mie`

Find AOPs whose Molecular Initiating Event matches a description.

**When to use:** when you know what your stressor does at the molecular level (the MIE) and want to find which AOPs start from that event.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `mie_description` | string | Description of the MIE, e.g. `ROS generation`, `receptor binding`, `DNA adduct formation` |
| `exposure_route` | string | Optional filter, e.g. `pulmonary`, `oral`, `dermal` |

**Example prompt:**
> "I am working with iron oxide nanoparticles by inhalation. The likely MIE is ROS generation. Which AOPs should I consider for a read-across strategy?"

---

## Example conversations

### Pathway-first approach
Start with an AOP, get the full structure, then drill into specific key events:

> **You:** Search for AOPs related to liver steatosis.
>
> **Assistant:** *(calls `aop_search`)* I found 4 relevant AOPs…
>
> **You:** Get the full structure of AOP57.
>
> **Assistant:** *(calls `aop_get_aop`)* AOP57 starts with…
>
> **You:** Tell me more about the MIE — what assays can measure it?
>
> **Assistant:** *(calls `aop_get_key_event`)* The MIE KE…

### Stressor-first approach
Start from a nanomaterial or chemical and find relevant pathways:

> **You:** I am testing TiO₂ nanoparticles by inhalation. Which AOPs are relevant?
>
> **Assistant:** *(calls `aop_find_by_mie` with "ROS generation" and "pulmonary")* …
>
> **You:** For the top AOP, what in vitro assays cover the key events?
>
> **Assistant:** *(calls `aop_get_aop`, then `aop_get_key_event` for each KE)* …

### Assay-first approach
Start from a method you already use and find which pathways it informs:

> **You:** I routinely use the DAPI assay in my lab. Which key events and AOPs does it relate to?
>
> **Assistant:** *(calls `aop_search` with "DAPI")* The DAPI assay measures…

---

## Tips for effective prompts

- **Be specific about the endpoint or organ** — "liver fibrosis" works better than "liver toxicity"
- **Mention the exposure route** when relevant — the MIE and pathway can differ between inhalation and oral routes
- **Use AOP IDs if you know them** — `aop_get_aop` with a specific ID gives richer results than a keyword search
- **Ask for assays explicitly** — the tools return assay information but the assistant summarises it only if you ask
- **Chain questions** — each tool call builds context; the assistant can combine results from multiple calls in one answer

---

## Data source

All data is served live from the AOP-Wiki Solr index (snapshot **2026-04-01**), the same index used by the [AOP Mapper UI](https://aop.adma.ai). The index includes KEC (Key Event Component) enrichment: biological object, process, and action annotations extracted by LLM from KE descriptions, extending the curator-entered annotations in AOP-Wiki.

Source: [AOP-Wiki](https://aopwiki.org) · [AOP-Wiki downloads](https://aopwiki.org/downloads)

---

## About

AOP Mapper MCP is funded by the European Union's H2020 programme under grants [953183 HARMLESS](https://www.harmless-project.eu/) and [964766 POLYRISK](https://polyrisk.science/) & Horizon Europe [101130073 PHANTASTIC](https://phantastic-project.eu/)
.

For questions or feedback: [support@ideaconsult.net](mailto:support@ideaconsult.net) or use the **💬** feedback link in the [AOP Mapper UI](https://aop.adma.ai).
