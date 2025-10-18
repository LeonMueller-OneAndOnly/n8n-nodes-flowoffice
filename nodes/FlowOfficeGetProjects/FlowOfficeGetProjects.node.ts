import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from "n8n-workflow"
import { NodeApiError, NodeConnectionTypes } from "n8n-workflow"

import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"
import { helper } from "../../src/transport/api-schema-bundled/helper"

import {
	buildOptions_boardId,
	buildOptions_subboardId,
	buildOptions_columnsForBoard_statusOnly,
	getBoardById,
} from "../../src/build-options/buildBoardOptions"

import z from "zod"

export class FlowOfficeGetProjects implements INodeType {
	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				}).then(buildOptions_boardId)
			},

			async listSubboards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				if (!selectedBoardId) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})

				const boardId = Number(selectedBoardId)
				return buildOptions_subboardId({ boards, boardId })
			},

			async listStatusColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				if (!selectedBoardId) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})
				const boardId = Number(selectedBoardId)
				return buildOptions_columnsForBoard_statusOnly(boards, boardId)
			},

			async listStatusLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				const statusColumnKey = this.getCurrentNodeParameter(
					"optionalFilters.statusColumnKey",
				) as string
				if (!selectedBoardId || !statusColumnKey) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})
				const boardId = Number(selectedBoardId)
				const board = getBoardById({ boards, boardId })
				if (!board) return []

				const statusCol = board.columnSchema.find((c) => c.columnKey === statusColumnKey)
				if (!statusCol || statusCol.columnType !== "status") return []

				const { labels } = helper.parseStatus_columnJson({
					columnJSON: statusCol.columnJSON ?? "",
				})
				return labels.map((l: { label: string; enumKey: string }) => ({
					name: l.label,
					value: l.enumKey,
				}))
			},
		},
	}
	description: INodeTypeDescription = {
		displayName: "Get Projects (FlowOffice)",
		name: "flowOfficeGetProjects",
		icon: {
			light: "file:FlowOfficeGetProjects.svg",
			dark: "file:FlowOfficeGetProjects.dark.svg",
		},
		group: ["input"],
		version: 1,
		description: "Fetch projects from FlowOffice with optional filters",
		defaults: {
			name: "Get Projects (FlowOffice)",
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
				typeOptions: {
					loadOptionsMethod: "listBoards",
				},
			},
			{
				displayName: "Subboard Name or ID",
				name: "subboardId",
				type: "options",
				description:
					'Choose a subboard of the selected board. The list populates after selecting a board. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				default: "",
				displayOptions: {
					hide: {
						boardId: [""],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId"],
					loadOptionsMethod: "listSubboards",
				},
			},
			{
				displayName: "Optional Filters",
				name: "optionalFilters",
				type: "collection",
				placeholder: "Add filters",
				default: {},
				hint: "These filters are optional. The API is paginated; the response may set 'hitLimit' to true when more results are available.",
				options: [
					{
						displayName: "From State Names or IDs",
						name: "fromStates",
						type: "multiOptions",
						default: [],
						description:
							'Only projects currently in one of these states. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						typeOptions: {
							loadOptionsDependsOn: ["boardId", "optionalFilters.statusColumnKey"],
							loadOptionsMethod: "listStatusLabels",
						},
					},
					{
						displayName: "Name Contains",
						name: "name",
						type: "string",
						default: "",
						placeholder: "e.g. Kundenprojekt",
					},
					{
						displayName: "Project ID",
						name: "projectId",
						type: "number",
						default: 0,
						placeholder: "e.g. 123",
					},
					{
						displayName: "Project UUID",
						name: "projectUuid",
						type: "string",
						default: "",
						placeholder: "e.g. 550e8400-e29b-41d4-a716-446655440000",
					},
					{
						displayName: "Status Column Name or ID",
						name: "statusColumnKey",
						type: "options",
						description:
							'Select a status column to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						default: "",
						typeOptions: {
							loadOptionsDependsOn: ["boardId"],
							loadOptionsMethod: "listStatusColumns",
						},
						hint: "Choose a status column to use with the labels to filter for.",
					},
					{
						displayName: "Label Names or IDs",
						name: "status_labels",
						type: "multiOptions",
						default: [],
						description:
							'Only projects whose next state is one of these. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						typeOptions: {
							loadOptionsDependsOn: ["boardId", "optionalFilters.statusColumnKey"],
							loadOptionsMethod: "listStatusLabels",
						},
					},
				],
			},
			{
				displayName: "Skip (Pagination)",
				name: "skip",
				type: "number",
				default: 0,
				placeholder: "e.g. 50",
				hint: "Optional. Offset for pagination. If the response 'hitLimit' is true, increase skip to fetch the next page.",
			},
		],
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const boardIdRaw = this.getNodeParameter("boardId", 0, "")
		const subboardIdRaw = this.getNodeParameter("subboardId", 0, "")
		const projectIdRaw = this.getNodeParameter("optionalFilters.projectId", 0, 0)
		const projectUuid = this.getNodeParameter("optionalFilters.projectUuid", 0, "") as string
		const name = this.getNodeParameter("optionalFilters.name", 0, "") as string
		const statusColumnKey = this.getNodeParameter(
			"optionalFilters.statusColumnKey",
			0,
			"",
		) as string
		const fromStates = this.getNodeParameter("optionalFilters.fromStates", 0, []) as string[]
		const status_labels = this.getNodeParameter("optionalFilters.status_labels", 0, []) as string[]
		const skipRaw = this.getNodeParameter("skip", 0, 0)

		const boardId = boardIdRaw ? z.coerce.number().int().parse(boardIdRaw) : undefined
		const subBoardId = subboardIdRaw ? z.coerce.number().int().parse(subboardIdRaw) : undefined
		const projectId = projectIdRaw ? z.coerce.number().int().parse(projectIdRaw) : undefined

		const body: {
			boardId?: number
			subBoardId?: number
			projektId?: number
			projektUuid?: string
			name?: string
			status?: {
				statusLabelKey?: string
				from?: string[]
				to?: string[]
			}
			skip?: number
		} = {}
		if (boardId !== undefined) body.boardId = boardId
		if (subBoardId !== undefined) body.subBoardId = subBoardId
		if (projectId !== undefined) body.projektId = projectId
		if (projectUuid) body.projektUuid = projectUuid
		if (name) body.name = name
		const skip = skipRaw ? z.coerce.number().int().min(0).parse(skipRaw) : undefined
		if (skip !== undefined) body.skip = skip

		if (statusColumnKey) {
			body.status = {
				statusLabelKey: statusColumnKey,
				from: Array.isArray(fromStates) ? fromStates : [],
				to: Array.isArray(status_labels) ? status_labels : [],
			}
		}

		try {
			// Use real endpoint: n8nApi_v1.endpoints.project.getProjects
			const response = await invokeEndpoint(n8nApi_v1.endpoints.project.getProjects, {
				thisArg: this,
				body,
			})

			const outItem: INodeExecutionData = { json: response as unknown as IDataObject }
			return [[outItem]]
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{ json: { error: (error as Error).message, filters: body } }]]
			}
			throw new NodeApiError(this.getNode(), error)
		}
	}
}
