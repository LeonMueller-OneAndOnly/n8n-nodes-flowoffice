import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow"

import { NodeConnectionTypes, NodeOperationError } from "n8n-workflow"

import {
	buildOptions_boardId,
	buildOptions_columnsForBoard_statusOnly,
} from "../../src/build-options/buildBoardOptions"
import {
	buildSwitchNodeClipboard,
	fetchStatusColumnsForBoard,
} from "../../src/status-switch-builder"
import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"

export class StatusColumnSwitchBuilder implements INodeType {
	description: INodeTypeDescription = {
		name: "statusColumnSwitchBuilder",
		displayName: "Status Column Switch Builder (FlowOffice)",
		icon: {
			light: "file:StatusColumnSwitchBuilder.svg",
			dark: "file:StatusColumnSwitchBuilder.dark.svg",
		},
		group: ["transform"],
		version: 1,
		description: "Generate Switch-node JSON snippets for each status column to reuse in workflows.",
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		defaults: {
			name: "Status Column Switch Builder (FlowOffice)",
		},
		subtitle: undefined,
		credentials: [
			{
				name: "flowOfficeApi",
				required: true,
			},
		],
		properties: [
			{
				displayName: "Board Name or ID",
				name: "boardId",
				type: "options",
				default: "",
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: "listBoards",
				},
				hint: "Select the board whose status columns you want to convert into Switch-node clipboard JSON.",
			},
			{
				displayName: "Status Column Name or ID",
				name: "statusColumnKey",
				type: "options",
				default: "",
				required: true,
				description:
					'Select the status column that should be transformed into a Switch node. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					hide: {
						boardId: [""],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId"],
					loadOptionsMethod: "listStatusColumns",
				},
				hint: "Pick the column whose labels should become Switch outputs.",
			},
			{
				displayName: "Status Label Key Expression",
				name: "statusValueExpression",
				type: "string",
				hint: "Expression used for the left side of each Switch condition. Adjust if your trigger uses a different field.",
				default: "={{ $json.status.to.labelKey }}",
				placeholder: "={{ $json.status.to.labelKey }}",
				displayOptions: {
					hide: {
						boardId: [""],
					},
				},
			},
			{
				displayName:
					"How to Use: 1. Select a board and status column. 2. Run the node. 3. Copy the whole output of this node (possible in the json view) and paste it with Strg-V into your workflow. You can also use our <a href='https://app.flow-office.eu/n8n-docs/tools/status-switch-builder' target='_blank'>web builder</a> for a guided copy step.",
				name: "clipboardHelper",
				type: "notice",
				default: "",
			},
		],
		usableAsTool: true,
	}

	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const boardsResponse = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})
				return buildOptions_boardId(boardsResponse)
			},
			async listStatusColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				if (!selectedBoardId) {
					return []
				}

				const boardsResponse = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})
				const boardId = Number(selectedBoardId)
				return buildOptions_columnsForBoard_statusOnly(boardsResponse, boardId)
			},
		},
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items: INodeExecutionData[] = []

		const boardId = Number(this.getNodeParameter("boardId", 0))
		const statusColumnKey = this.getNodeParameter("statusColumnKey", 0) as string
		const statusValueExpression = this.getNodeParameter(
			"statusValueExpression",
			0,
			"={{ $json.status.to.labelKey }}",
		)
			?.toString()
			.trim()

		const columns = await fetchStatusColumnsForBoard({ thisArg: this, boardId })
		const column = columns.find((col) => col.columnKey === statusColumnKey)
		if (!column) {
			throw new NodeOperationError(
				this.getNode(),
				`Status column '${statusColumnKey}' was not found on board '${boardId}'. Please refresh the node options and try again.`,
			)
		}

		const { json } = buildSwitchNodeClipboard({
			boardId,
			boardName: column.boardName,
			columnKey: column.columnKey,
			columnLabel: column.columnLabel,
			labels: column.labels,
			statusValueExpression: statusValueExpression || undefined,
		})

		items.push({
			json: JSON.parse(json),
		})

		return [items]
	}
}
