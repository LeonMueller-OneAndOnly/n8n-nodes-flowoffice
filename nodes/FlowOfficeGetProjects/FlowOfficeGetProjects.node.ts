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
				return [
					...buildOptions_columnsForBoard_statusOnly(boards, boardId),
					{
						name: "_Empty_",
						value: "-",
					},
				]
			},

			async listStatusLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				const statusColumnKey = this.getCurrentNodeParameter("statusColumnKey") as string
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
				required: true,
				typeOptions: {
					loadOptionsMethod: "listBoards",
				},
				hint: "The cells of the projekte returned here can vary depending on the board. You can use the 'List columns of a board' node to get the columns of the board and see what is available.",
			},
			// Subboard moved into optional filters below
			// Optional filters collection for IDs/UUIDs and name
			{
				displayName: "Optional Filters",
				name: "optionalFilters",
				type: "collection",
				placeholder: "Add filters",
				default: {},
				displayOptions: {
					hide: { boardId: [""] },
				},
				hint: "Optionally filter by name, IDs, UUIDs. You can mix single and CSV values.",
				// eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
				options: [
					{
						displayName: "Subboard Name or ID",
						name: "subboardId",
						type: "options",
						description:
							'Choose a subboard of the selected board. The list populates after selecting a board. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						default: "",
						typeOptions: {
							loadOptionsDependsOn: ["boardId"],
							loadOptionsMethod: "listSubboards",
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
						displayName: "Project IDs (CSV)",
						name: "projectIdsCsv",
						type: "string",
						default: "",
						placeholder: "e.g. 101,102,103",
						hint: "Comma-separated list of project IDs.",
					},
					{
						displayName: "Project UUID",
						name: "projectUuid",
						type: "string",
						default: "",
						placeholder: "e.g. 550e8400-e29b-41d4-a716-446655440000",
					},
					{
						displayName: "Project UUIDs (CSV)",
						name: "projectUuidsCsv",
						type: "string",
						default: "",
						placeholder: "e.g. uuid-1,uuid-2",
						hint: "Comma-separated list of project UUIDs.",
					},
				],
			},

			{
				displayName: "Status Column Name or ID",
				name: "statusColumnKey",
				type: "options",
				// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-options
				default: "_Empty_",
				description:
					'Select a status column to filter by, then choose its labels below. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',

				displayOptions: {
					hide: {
						boardId: [""],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId"],
					loadOptionsMethod: "listStatusColumns",
				},
				hint: "Pick one status column first, then select multiple labels below.",
			},
			{
				displayName: "Status Label Names or IDs",
				name: "status_labels",
				type: "multiOptions",
				default: [],
				options: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: "Specify labels by display name or label UUID. Multiple labels are supported. The filter is only applied when at least one label is specified.",
				displayOptions: {
					hide: {
						boardId: [""],
						statusColumnKey: ["", "_Empty_"],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId", "statusColumnKey"],
					loadOptionsMethod: "listStatusLabels",
				},
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

		const subboardIdRaw = this.getNodeParameter("optionalFilters.subboardId", 0, "")

		const name = this.getNodeParameter("optionalFilters.name", 0, "") as string
		const projectIdRaw = this.getNodeParameter("optionalFilters.projectId", 0, 0)
		const projectIdsCsv = this.getNodeParameter("optionalFilters.projectIdsCsv", 0, "") as string
		const projectUuid = this.getNodeParameter("optionalFilters.projectUuid", 0, "") as string
		const projectUuidsCsv = this.getNodeParameter(
			"optionalFilters.projectUuidsCsv",
			0,
			"",
		) as string

		const statusColumnKey = this.getNodeParameter("statusColumnKey", 0, "") as string
		const status_labels = this.getNodeParameter("status_labels", 0, []) as string[]
		const skipRaw = this.getNodeParameter("skip", 0, 0)

		const boardId = boardIdRaw ? z.coerce.number().int().parse(boardIdRaw) : undefined
		const subBoardId = subboardIdRaw ? z.coerce.number().int().parse(subboardIdRaw) : undefined
		const projectId = projectIdRaw ? z.coerce.number().int().parse(projectIdRaw) : undefined

		const body: z.infer<typeof n8nApi_v1.endpoints.project.getProjects.inputSchema> = {}

		if (boardId !== undefined) body.boardId = boardId
		if (subBoardId !== undefined) body.subBoardId = subBoardId
		// projektId: number | number[] from single + CSV
		{
			const idsFromCsv = (projectIdsCsv || "")
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0)
				.map((s) => Number(s))
				.filter((n) => Number.isFinite(n) && Number.isInteger(n))
			const uniqueIds = Array.from(
				new Set([...(idsFromCsv || []), ...(projectId !== undefined ? [projectId] : [])]),
			) as number[]
			if (uniqueIds.length === 1) body.projektId = uniqueIds[0]
			else if (uniqueIds.length > 1) body.projektId = uniqueIds
		}

		// projektUuid: string | string[] from single + CSV
		{
			const uuidsFromCsv = (projectUuidsCsv || "")
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0)
			const allUuids = [...uuidsFromCsv, ...(projectUuid ? [projectUuid] : [])]
			const uniqueUuids = Array.from(new Set(allUuids))
			if (uniqueUuids.length === 1) body.projektUuid = uniqueUuids[0]
			else if (uniqueUuids.length > 1) body.projektUuid = uniqueUuids
		}
		if (name) body.name = name
		const skip = skipRaw ? z.coerce.number().int().min(0).parse(skipRaw) : undefined
		if (skip !== undefined) body.skip = skip

		if (statusColumnKey) {
			body.status = {
				statusColumnKey: statusColumnKey,
				filterLabels_keyOrName: Array.isArray(status_labels) ? status_labels : [],
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
