---
layout: "layouts/simple.njk"
eleventyExcludeFromCollections: true
permalink: "/aop/help.html"
title: "AOP Mapper guide"
description: "User guide for AOP Mapper"
date: Last Modified
container_type: container
logoUri: "/assets/img/logo-aopmapper.svg"
logoHref: "/aop"
aop_version: "2026-04-01"
---

# AOP Mapper User Guide

**AOP Mapper** URL: [https://aop.adma.ai/](https://aop.adma.ai)

## Overview

The AOP Mapper is an interactive web tool for exploring and querying the [AOP-Wiki](https://aopwiki.org) knowledge base. It enables users to search, filter, and visualise relationships among all AOP-Wiki object types: Adverse Outcome Pathways (AOPs), Molecular Initiating Events (MIEs), Key Events (KEs), Key Event Relationships (KERs), Key Event Components (biological objects, processes, and actions), Adverse Outcomes (AOs), chemicals, stressors, assays, and taxonomy applicability entries.

### Implementation

AOP Mapper is a React single-page application that queries an [Apache Solr](https://solr.apache.org/) index built from the AOP-Wiki XML export (version **{{aop_version}}**), available at [https://aopwiki.org/downloads](https://aopwiki.org/downloads). The index is built by a separate Python preprocessing pipeline.

Search state is fully encoded in the browser URL, so any query can be bookmarked or shared as a link. Loading a URL with query parameters automatically executes the search.

---

## Search Form

The search form at the top of the page is organised in four rows.

### Row 1 — Free text, ID, and graph traversal

| Field | Description |
|---|---|
| **Free text search** | Full-text search across all indexed fields. Accepts plain keywords or Solr query syntax (e.g. `type_s:(stressor OR chemical) AND nano*`). Leave empty to match all documents. |
| **ID** | Exact AOP-Wiki object identifier, e.g. `AOP144`, `KE1696`, `KER1`. Matched against the `id` field. Can be combined with free text. |
| **Graph Traversal** | Extends the result set by traversing the AOP network. See [Graph Traversal Options](#graph-traversal-options) below. |
| **AOP Wiki Search** | Executes the search with all current form values. |
| **💬** | Opens the feedback form. |

### Row 2 — Key Event filters

All fields in this row use autocomplete: type at least two characters to see suggestions, then select from the dropdown. Selecting a value adds it as a filter (`AND` clause) to the query.

| Field | Solr field | Description |
|---|---|---|
| **Biological Object** | `biological_object_ids_ss` | Biological object component of a key event (e.g. *mitochondria*, *DNA*). |
| **Biological Process** | `biological_process_ids_ss` | Biological process component of a key event (e.g. *oxidative phosphorylation*). |
| **Biological Action** | `biological_action_ids_ss` | Biological action component of a key event (e.g. *increased*, *decreased*). |
| **Biological Organisation** | `biological_organization_level_t` | Level of biological organisation (e.g. *molecular*, *cellular*, *organ*). |
| **Organ** | `attr_organ_term` | Organ or tissue to which the KE applies (e.g. *liver*, *lung*). |
| **Cell** | `attr_cell_term` | Cell type associated with the KE (e.g. *hepatocyte*, *macrophage*). |

### Row 3 — Additional filters

| Field | Solr field | Description |
|---|---|---|
| **Applicability taxonomy** | `attr_applicability_taxonomy` | Species or taxon applicability (e.g. *human*, *rat*, *zebrafish*). |
| **MIE** | `molecular_initiating_event_ss` | Filter AOPs by a specific Molecular Initiating Event. Type a KE title or ID (e.g. `KE1495`). |
| **Adverse Outcomes** | `adverse_outcome_ss` | Filter AOPs by a specific Adverse Outcome. Type a KE title or ID (e.g. `KE1458`). |
| **Measurement Methodology** | `attr_assays` | Assay or measurement method associated with a key event (e.g. `DAPI`, `ELISA`). |
| **Chemical name/CAS RN** | `casrn_s` | Chemical name or CAS registry number of a stressor (e.g. `134098-61-6`). |
| **DOI** | `doi_ss` | Filter to items citing a specific publication by DOI (e.g. `10.3389/ftox.2021.653386`). |

### Row 4 — Result types

Checkboxes to restrict results to one or more object types. **All** selects every type; **None** clears all.

| Checkbox | `type_s` value | Description |
|---|---|---|
| AOP | `aop` | Adverse Outcome Pathway |
| KE | `key_event` | Key Event (includes MIEs and AOs) |
| Chemical | `chemical` | Chemical entity |
| Stressor | `stressor` | Stressor (physical or chemical agent) |
| Assay | `assay` | Measurement methodology extracted from KE descriptions |
| Bio process | `biological_process` | Biological process component |
| Bio object | `biological_object` | Biological object component |
| Bio action | `biological_action` | Biological action component |
| Bio event | `bio_event_triple` | Biological event triple (object–process–action) |
| Taxonomy | `taxonomy` | Taxonomic applicability entry |
| KER | `key_event_relationship` | Key Event Relationship |

---

## Graph Traversal Options

The **Graph Traversal** dropdown controls whether and how the query result set is expanded by walking the AOP network in Solr.

| Option | Direction | Description |
|---|---|---|
| `None` | — | No traversal. Returns only the documents directly matching the query. |
| `Upstream 1–5` | Upstream | Expands results up to N steps upstream (`upstream_ss` links). |
| `Upstream (ALL)` | Upstream | Expands results to all upstream nodes (no depth limit). |
| `Downstream -1 to -5` | Downstream | Expands results up to N steps downstream (`downstream_ss` links). |
| `Downstream (ALL)` | Downstream | Expands results to all downstream nodes (no depth limit). |
| `AOP graph` | Both | Returns all KEs, MIEs, AOs, and stressors linked to matching AOPs via a multi-directional join. Useful for retrieving the full content of one or more AOPs. |
| `AOP extended` | Both | As `AOP graph` plus a depth-1 graph traversal, adding bio event triples, assays, and chemicals associated with those KEs. |
| `MIE by AOP` | — | Returns the MIEs of matching AOPs. |
| `AO by AOP` | — | Returns the Adverse Outcomes of matching AOPs. |
| `KE by AOP` | — | Returns all Key Events of matching AOPs. |
| `Stressors by AOP` | — | Returns the stressors of matching AOPs. |
| `Similarity` | — | Returns the 10 most chemically similar documents to the query compound using a molecular fingerprint vector index. Requires the query to resolve to a compound with a stored fingerprint. |

**Tip:** Combine `ID = AOP144` with `Graph = AOP graph` to retrieve the complete pathway for AOP144. Add `Graph = AOP extended` to also see its associated assays and chemicals.

---

## Results Tab

The default tab shows a paginated results table.

- **ID column** — links directly to the corresponding AOP-Wiki page for AOPs, KEs, KERs, and stressors.
- **Copy icon** (📋) — copies the identifier into the **ID** field for a follow-up search.
- **Columns** — table columns are auto-hidden when empty. Use the **Columns** button to toggle visibility.
- **Sort** — click any column header to sort; click again to reverse.
- **Pagination** — select 10, 25, or 50 rows per page.
- **Row click** — opens the **Detail Panel** on the right (see below).

### Facet Sidebar

When results contain mixed object types, a facet sidebar appears on the left showing the count for each `type_s`. Click a type to toggle it in the active type filter. This is equivalent to checking/unchecking the corresponding **Result type** checkbox.

### Detail Panel

Clicking a result row opens a detail panel showing all available metadata for that object:

- Title, short name, description
- Biological organisation level, organ, cell type
- Upstream and downstream linked IDs — each with a 🔍 button to re-run the search for that ID
- MIEs and Adverse Outcomes (for AOPs)
- Associated assays
- Chemical name and CAS RN (for chemicals)
- DOI references as clickable `https://doi.org/…` links
- OECD status and project
- Point of contact

---

## View & Download Tab (Network Graph)

Switching to this tab renders a force-directed network graph of the current results using [vis-network](https://visjs.github.io/vis-network/docs/network/).

### Node colours by type

| Colour | Type |
|---|---|
| Blue | AOP |
| Amber | KE (intermediate) |
| Cyan | KE root (no upstream KE — likely MIE in context) |
| Orange | KE leaf (no downstream KE — likely AO in context) |
| Green | Stressor |
| Pink | Chemical |
| Purple | Assay |
| Slate | Bio event triple |

### Interactions

- **Hover** over a node to see a tooltip with its title.
- **Click** a node to open the Detail Panel.
- **Scroll** to zoom; **drag the background** to pan.
- **Force-directed / Hierarchical** toggle — switches between physics-based layout and a top-down hierarchy.
- **Physics** toggle — enables or disables the physics simulation (auto-disabled above 500 nodes).

### Download

The **Download CSV** button exports all result documents as a CSV file. Multi-value fields are joined with `|`. The graph is capped at **500 nodes** for rendering performance; the CSV always contains all results regardless of this cap.

---

## Example Queries Tab

Click any tag to load a pre-built example into the search form. Then click **AOP Wiki Search** to run it. Examples cover common use cases including AOP graph retrieval, nanotoxicology stressor queries, assay-to-pathway mapping, OECD status filtering, and literature DOI searches.

---

## Debug Info Tab

Shows the exact Solr query string sent for the last search, including the full `q` parameter after graph traversal expansion. Also includes a generated **Python** code snippet using `requests` that you can copy and run to reproduce the query programmatically.

---

## URL Parameters

Every search is fully encoded in the browser URL. You can share or bookmark any query. Loading a URL with parameters automatically executes the search — no need to click Search manually.

| Parameter | Description | Example |
|---|---|---|
| `q` | Free text query | `q=oxidative+stress` |
| `fieldId` | AOP-Wiki identifier | `fieldId=AOP144` |
| `graph` | Graph traversal option | `graph=AOP` |
| `types` | Comma-separated result types | `types=aop,key_event` |
| `filters` | URL-encoded JSON of filter field values | (set automatically by the form) |

**Example:** [`https://aop.adma.ai/?fieldId=AOP144&graph=AOP`](https://aop.adma.ai/?fieldId=AOP144&graph=AOP) — loads and immediately runs the AOP graph for AOP144.

---

## Frequently Used Queries

| Goal | How |
|---|---|
| Full pathway for a known AOP | ID = `AOP144`, Graph = `AOP graph`, types = AOP + KE |
| All KEs for a nano stressor | Free text = `nano*`, Graph = `Downstream (ALL)`, types = KE + Stressor |
| Which AOPs use a specific assay | Measurement Methodology = `DAPI`, Graph = `Upstream (ALL)`, types = KE + AOP |
| AOPs endorsed by OECD | Free text = `oecd_status_t:(WPHA/WNT Endorsed)`, types = AOP |
| AOPs citing a specific paper | DOI = `10.3389/ftox.2021.653386` |
| Full extended view of one AOP | ID = `AOP451`, Graph = `AOP extended`, all types selected |
| AOPs applicable to human | Applicability taxonomy = `human`, types = AOP |
| Find AOPs by adverse outcome | Adverse Outcomes = type or select a KE title, Graph = `AOP graph` |

---

## About

AOP Mapper is funded by the European Union's Horizon 2020 programme under grants [953183 HARMLESS](https://www.harmless-project.eu/) and [964766 POLYRISK](https://polyrisk.science/).

For questions or feedback: [support@ideaconsult.net](mailto:support@ideaconsult.net) or use the **💬** feedback link in the search form.
