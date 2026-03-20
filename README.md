# Figma Design Extractor

Node/TypeScript CLI for turning one or more Figma files into a compact design catalog, usage graph, review candidates, mapping validation, and drift reports.

## What it does

It fetches one or more Figma files and writes a reduced representation focused on:

- pages
- component sets
- components
- instances
- page-level usage of components
- basic review candidates for detached / suspicious look-alikes
- baseline snapshots and diffs
- explicit many-to-many `design ↔ code` mappings

## What it does **not** do in this first version

- no automatic code extraction from your repo
- no true cross-file library resolution beyond what the Figma file itself exposes
- no full visual token drift yet (colors / typography / spacing / effects)
- no AI matching or fuzzy automatic mapping
- no page generation from design

## Why Node and not bash

The CLI needs multi-file traversal, normalized entities, deterministic output, mapping validation, baseline storage, and semantic diffing. That is much easier to keep stable in Node than in `bash + curl + jq`.

## Install

```bash
npm install
```

## Configure

Copy `config.example.json` and set your file keys:

```bash
cp config.example.json config.json
```

Set the token in env:

```bash
export FIGMA_TOKEN=your_token
```

> Figma updated token behavior in 2025: PATs now have expirations, and `files:read` is no longer the recommended scope in favor of more specific scopes such as `file_content:read`. Also, a lightweight file metadata endpoint exists, but this tool currently uses `GET /v1/files/:key` because it needs the document tree. citeturn844511search0turn156217search3

## Commands

### Extract

Fetches all configured files and writes compact outputs to the chosen directory.

```bash
npm run extract -- --config ./config.json --out ./out/current
```

Writes:

- `figma-files.json`
- `design-catalog.json`
- `design-usage.json`
- `design-review.json`

### Update baseline

Copies a current extraction into a baseline folder.

```bash
npm run baseline:update -- --from ./out/current --baseline ./baseline
```

### Diff

Compares current extraction with baseline and optionally validates mappings.

```bash
npm run diff -- --current ./out/current --baseline ./baseline --mapping ./mapping.json --out ./out/diff
```

Writes:

- `diff.json`
- `mapping-validation.json`
- `report.md`

### Report only

Rebuilds `report.md` from an existing diff JSON.

```bash
npm run report -- --diff ./out/diff/diff.json --out ./out/diff/report.md
```

## Output model

### `figma-files.json`

Metadata per source file:

```json
{
  "generatedAt": "2026-03-19T15:00:00.000Z",
  "files": [
    {
      "fileKey": "abc123",
      "alias": "ui-kit",
      "name": "UI Kit",
      "version": "123:456",
      "lastModified": "2026-03-19T11:22:00Z"
    }
  ]
}
```

### `design-catalog.json`

Canonical design entities from all files:

- `pages`
- `componentSets`
- `components`
- `instances`

Every entity has:

- `fileKey`
- `nodeId`
- `designRef` (`figma://FILE_KEY/NODE_ID`)

### `design-usage.json`

Usage summary per page:

- what component refs are used
- how many times
- which property values were observed on instances

### `design-review.json`

Non-canonical review candidates:

- suspicious `FRAME`/`GROUP`/`SECTION` nodes
- name-similar blocks that may be detached copies or manual duplicates
- possible matches to canonical components / sets

This file is deliberately a review layer, not design truth.

### `mapping.json`

Manual many-to-many mapping registry:

```json
{
  "mappings": [
    {
      "id": "button-primary",
      "designRef": "figma://abc123/10:21",
      "codeRef": "storybook://components-button",
      "relation": "exact",
      "status": "active",
      "source": "manual",
      "notes": "Canonical button"
    }
  ]
}
```

Recommended approach:
- keep one mapping per relation
- allow multiple design refs to point to the same code ref
- allow multiple code refs for a single design ref when needed
- keep mapping explicit, do not infer it from names

## How review candidates work

This first version uses a conservative heuristic:
- look at non-canonical nodes of configured types (`FRAME`, `GROUP`, `SECTION`)
- compare normalized names against known component and component set names
- if similar enough, emit them as `detached-candidate` or `name-similar-candidate`

That keeps them out of the canonical catalog while still surfacing likely designer copies.

## Suggested workflow

1. Extract current design state
2. Review `design-review.json`
3. Maintain `mapping.json`
4. Update `baseline/` when design is agreed
5. Run diff in CI or locally to detect drift

## Figma API notes

This tool is intentionally centered around the file tree returned by `GET /v1/files/:key`, because that endpoint exposes the document nodes needed for pages, component sets, components, instances, and their properties. Figma also documents file versions, variables, and custom parser integration for Code Connect if you extend this later. citeturn844511search0turn156217search3turn156217search7
