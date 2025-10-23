# n8n-nodes-flowoffice

This is an n8n community node. It lets you use FlowOffice in your n8n workflows.

FlowOffice is a project, team and customer management platform. This package allows to easily work with the existing API inside n8n.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [n8n-nodes-flowoffice](#n8n-nodes-flowoffice)
  - [Installation](#installation)
  - [Credentials](#credentials)
  - [Available nodes](#available-nodes)
  - [Usage examples](#usage-examples)
  - [Compatibility](#compatibility)
  - [Resources](#resources)
  - [Version history](#version-history)

## Installation

Install from the n8n UI (Community Nodes):

1. Open Settings → Community Nodes → Install.
2. Enter the package name:

   ```
   n8n-nodes-flowoffice
   ```

3. Confirm the Community Nodes warning and click Install.

For more details, see the official n8n guide on installing Community Nodes and the FlowOffice docs at `https://app.flow-office.eu/n8n-docs`.

## Credentials

Use the built-in credential type `FlowOffice API`.

- Base URL: Default `https://app.flow-office.eu` (use `http://127.0.0.1:3000` for local dev).
- API Key: Bearer token generated in FlowOffice.

Create an API key in FlowOffice, then add it to n8n:

1. In FlowOffice, log in and open the API key page (`/api-keys`).
2. Create a new key (for example: “n8n Production”) and copy it.
3. In n8n, create new credentials of type “FlowOffice API”.
4. Set Base URL and paste the API key. Save and test.

Reference: FlowOffice n8n documentation at `https://app.flow-office.eu/n8n-docs`.

## Available nodes

- Create Project (FlowOffice)
  - Purpose: Create one or many projects in a selected board (and optional subboard) by mapping input data to board columns.
  - Key parameters:
    - Board Name or ID (required)
    - Subboard Name or ID (optional)
    - Fields (resource mapper): map your input fields to board columns; supports status options, dates, numbers, etc.
  - Output: One item per input with `{ boardId, subboardId, project }` including the created project.

- Get Projects (FlowOffice)
  - Purpose: Fetch projects with optional filters and pagination.
  - Key parameters:
    - Board Name or ID (required)
    - Optional Filters: Subboard, Name Contains, Project ID(s), Project UUID(s)
    - Status filter: choose a status column, then one or more labels
    - Skip (pagination)
  - Output: Projects and related metadata; if the response indicates a limit, increase Skip to paginate.

- List columns of a board (FlowOffice)
  - Purpose: Inspect the column schema for a board, including status labels, to drive mappings and filters.
  - Key parameters:
    - Board Name or ID (required)
  - Output: `{ boardId, boardName, columns[] }` where status columns include their labels.

- Trigger on Project Status Change (FlowOffice)
  - Purpose: Start a workflow when a project’s status changes in a selected board.
  - Key parameters:
    - Board Name or ID (required)
    - Status Column Name or ID (required)
    - Optional: limit to specific FROM/TO status labels; optional Subboard
  - Output: Event payload from FlowOffice via webhook.

See the FlowOffice docs for screenshots and details: `https://app.flow-office.eu/n8n-docs`.

## Usage examples

- Create projects from CSV or form submissions:
  1. Use “List columns of a board” to understand available columns and status labels.
  2. Pipe your input (e.g., from HTTP Trigger, CSV, or Form) into “Create Project (FlowOffice)”.
  3. Map fields in the resource mapper; execute to create one item per input row.

- Fetch projects by status:
  1. “Get Projects (FlowOffice)” → pick a board.
  2. Select a Status column and one or more labels.
  3. Use Skip to page through when needed.

- React to status changes:
  1. Add “Trigger on Project Status Change (FlowOffice)”.
  2. Select board and status column; optionally filter by FROM/TO labels.
  3. Connect downstream actions (notify, update systems, etc.).

## Compatibility

Works with n8n versions that support Community Nodes. Tested with recent n8n 1.x releases.

## Resources

- n8n community nodes documentation: https://docs.n8n.io/integrations/#community-nodes
- FlowOffice n8n documentation: https://app.flow-office.eu/n8n-docs

## Version history

See CHANGELOG.md for notable changes.
