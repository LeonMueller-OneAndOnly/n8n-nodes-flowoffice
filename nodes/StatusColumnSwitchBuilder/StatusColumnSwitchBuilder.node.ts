import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow"

import { NodeConnectionTypes } from "n8n-workflow"

import { buildOptions_boardId } from "../../src/build-options/buildBoardOptions"
import {
	buildSwitchBuilderItems,
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
				displayName: "Status Value Expression",
				name: "statusValueExpression",
				type: "string",
				default: "={{ $json.status.to.labelKey }}",
				description:
					"Expression used for the left side of each Switch condition. Adjust if your trigger uses a different field.",
				placeholder: "={{ $json.status.to.labelKey }}",
				displayOptions: {
					hide: {
						boardId: [""],
					},
				},
			},
			{
				displayName: "Clipboard Helper",
				name: "clipboardHelper",
				type: "notice",
				default:
					"Use the generated JSON with the n8n clipboard (Edit → Paste from clipboard). For a UI helper visit https://app.flow-office.eu/n8n-docs/tools/status-switch-builder.",
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
		},
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items: INodeExecutionData[] = []

		const boardId = Number(this.getNodeParameter("boardId", 0))
		const statusValueExpression = (
			this.getNodeParameter("statusValueExpression", 0, "={{ $json.status.to.labelKey }}") as string
		).trim()

		const columns = await fetchStatusColumnsForBoard({ thisArg: this, boardId })
		const switchItems = buildSwitchBuilderItems(columns, {
			statusValueExpression: statusValueExpression || undefined,
		})

		for (const switchItem of switchItems) {
			items.push({
				json: {
					boardId: switchItem.boardId,
					boardName: switchItem.boardName,
					columnKey: switchItem.columnKey,
					columnLabel: switchItem.columnLabel,
					labelCount: switchItem.labels.length,
					labels: switchItem.labels,
					switchNodeName: switchItem.nodeName,
					switchNodeJson: switchItem.switchNodeJson,
					switchNodeWorkflow: switchItem.switchNodeWorkflow,
					outputCount: switchItem.outputCount,
				},
			})
		}

		return [items]
	}
}
