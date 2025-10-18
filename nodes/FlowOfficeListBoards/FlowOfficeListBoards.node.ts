import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow"
import { NodeConnectionTypes } from "n8n-workflow"

import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"
import { helper } from "../../src/transport/api-schema-bundled/helper"

import { buildOptions_boardId, getBoardById } from "../../src/build-options/buildBoardOptions"

export class FlowOfficeListBoards implements INodeType {
	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				}).then(buildOptions_boardId)
			},
		},
	}
	description: INodeTypeDescription = {
		displayName: "List Boards (FlowOffice)",
		name: "flowOfficeListBoards",
		icon: {
			light: "file:FlowOfficeListBoards.svg",
			dark: "file:FlowOfficeListBoards.dark.svg",
		},
		group: ["input"],
		version: 1,
		description: "Select a board and output all its columns (including status labels)",
		defaults: {
			name: "List Boards (FlowOffice)",
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: "flowOfficeApi",
				required: true,
			},
		],
		properties: [
			{
				displayName: "Board Name or ID",
				placeholder: "Select a board",
				name: "boardId",
				type: "options",
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: "",
				required: true,
				typeOptions: {
					loadOptionsMethod: "listBoards",
				},
				hint: "First select a board. Execution outputs all columns for that board.",
			},
		],
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const selectedBoardId = this.getNodeParameter("boardId", 0) as string | number
		if (!selectedBoardId) return [[{ json: { boardId: null, columns: [] } }]]

		const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
			thisArg: this,
			body: null,
		})

		const boardId = Number(selectedBoardId)
		const board = getBoardById({ boards, boardId })
		if (!board) return [[{ json: { boardId, boardName: undefined, columns: [] } }]]

		const columns = board.columnSchema.map((col) => {
			if (col.columnType === "status") {
				const { labels } = helper.parseStatus_columnJson({ columnJSON: col.columnJSON ?? "" })
				return {
					columnKey: col.columnKey,
					label: col.label,
					columnType: col.columnType,
					statusLabels: labels.map((l: { label: string; enumKey: string }) => ({
						label: l.label,
						enumKey: l.enumKey,
					})),
				}
			}
			return {
				columnKey: col.columnKey,
				label: col.label,
				columnType: col.columnType,
			}
		})

		const out: INodeExecutionData = {
			json: {
				boardId: board.boardId,
				boardName: board.name,
				columns,
			},
		}

		return [[out]]
	}
}
