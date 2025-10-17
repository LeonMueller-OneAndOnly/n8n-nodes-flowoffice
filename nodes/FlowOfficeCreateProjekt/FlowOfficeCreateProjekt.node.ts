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

import {
	buildOptions_boardId,
	buildOptions_columnsForBoard,
	buildOptions_columnsForBoard_nonStatus,
	buildOptions_columnsForBoard_statusOnly,
	getBoardById,
} from "../../src/build-options/buildBoardOptions"
import { buildOptions_statusLabels } from "../../src/build-options/buildStatusOptions"
import { locales } from "zod"

export class FlowOfficeCreateProjekt implements INodeType {
	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				}).then(buildOptions_boardId)
			},

			async listColumnsAll(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				if (!selectedBoardId) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})

				const boardId = Number(selectedBoardId)

				return buildOptions_columnsForBoard({ boards, boardId })
			},

			async listColumnsStatusOnly(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				if (!selectedBoardId) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})

				const boardId = Number(selectedBoardId)
				return buildOptions_columnsForBoard_statusOnly(boards, boardId)
			},

			async listColumnsNonStatus(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				if (!selectedBoardId) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})

				const boardId = Number(selectedBoardId)
				return buildOptions_columnsForBoard_nonStatus(boards, boardId)
			},

			async listStatusLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				const columnKey =
					(this.getCurrentNodeParameter("statusColumnKey") as string | undefined) ??
					(this.getCurrentNodeParameter("columnKey") as string | undefined)

				if (!selectedBoardId || typeof columnKey !== "string") return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})

				const boardId = Number(selectedBoardId)

				const board = getBoardById({ boards, boardId })
				if (!board) return []

				const column = board.columnSchema.find((c) => c.columnKey === columnKey)
				if (!column || column.columnType !== "status") return []

				return buildOptions_statusLabels({ boards, boardId, columnKey })
			},

			async getSelectedColumnType(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				const columnKey =
					(this.getCurrentNodeParameter("statusColumnKey") as string | undefined) ??
					(this.getCurrentNodeParameter("columnKey") as string | undefined)

				if (!selectedBoardId || !columnKey) return []

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})

				const board = getBoardById({ boards, boardId: Number(selectedBoardId) })
				if (!board) return []

				const col = board.columnSchema.find((c) => c.columnKey === columnKey)
				if (!col) return []

				return [
					{
						name: col.columnType,
						value: col.columnType,
						description: `Detected type for ${columnKey}`,
					},
				]
			},
		},
	}
	description: INodeTypeDescription = {
		displayName: "Create Projekt (FlowOffice)",
		name: "flowOfficeCreateProjekt",
		icon: {
			light: "file:FlowOfficeCreateProjekt.svg",
			dark: "file:FlowOfficeCreateProjekt.dark.svg",
		},
		group: ["input"],
		version: 1,
		description: "Create a project in FlowOffice",
		defaults: {
			name: "Create Project (FlowOffice)",
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
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: "Board Name or ID",
				placeholder: "Select a board",
				name: "boardId",
				// description: 'The description text',
				type: "options",
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. <br/>Each board has different columns. Provide a mapping for which input field should go to which column in your selected board.',
				default: "",
				required: true,
				typeOptions: {
					loadOptionsMethod: "listBoards",
				},
				hint: "Each board can have different columns. First select the board and then provide the mapping, which input field should go to which column in your selected board.",
			},

			{
				displayName: "Regular Column Mappings",
				name: "valueMappings",
				description: "Set values for non-status columns",
				type: "fixedCollection",
				placeholder: "Add regular column mapping",
				default: { mappings: [] },
				typeOptions: {
					multipleValues: true,
					loadOptionsDependsOn: ["boardId"],
				},
				options: [
					{
						displayName: "Mapping",
						name: "mappings",
						values: [
							{
								displayName: "Column Name or ID",
								name: "columnKey",
								type: "options",
								required: true,
								typeOptions: {
									loadOptionsMethod: "listColumnsNonStatus",
									loadOptionsDependsOn: ["boardId"],
								},
								description: "Choose a non-status column",
								default: "",
							},
							{
								displayName: "Value",
								name: "value",
								type: "string",
								default: "",
								description: "Use expressions to map from input JSON",
							},
						],
					},
				],
			},
			{
				displayName: "Status-Column Mappings",
				name: "statusMappings",
				description: "Set labels for status-type columns",
				type: "fixedCollection",
				placeholder: "Add status column mapping",
				default: { mappings: [] },
				typeOptions: {
					multipleValues: true,
					loadOptionsDependsOn: ["boardId"],
				},
				hint: "Each status-column can have different labels. First select the status-column and then specify which label shall be used for the new projekt.",
				options: [
					{
						displayName: "Mapping",
						name: "mappings",
						values: [
							{
								displayName: "Status Column",
								name: "statusColumnKey",
								type: "options",
								required: true,
								typeOptions: {
									loadOptionsMethod: "listColumnsStatusOnly",
									loadOptionsDependsOn: ["boardId"],
								},
								description: "Choose a status column",
								default: "",
							},
							{
								displayName: "Label Name or ID",
								name: "statusLabel",
								type: "options",
								default: "",
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: "listStatusLabels",
									loadOptionsDependsOn: ["boardId", "statusColumnKey"],
								},
							},
						],
					},
				],
			},
		],
	}

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData()
		const nodeParameters = this.getNode().parameters ?? {}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex]
			if (!item) continue
			const currentJson = item.json ?? {}
			const evaluatedParameters: Record<string, unknown> = {}
			for (const key of Object.keys(nodeParameters)) {
				try {
					evaluatedParameters[key] = this.getNodeParameter(
						key as string,
						itemIndex,
						(nodeParameters as Record<string, unknown>)[key],
					)
				} catch {
					// Fallback to raw parameter if evaluation is not applicable
					evaluatedParameters[key] = (nodeParameters as Record<string, unknown>)[key]
				}
			}
			item.json = {
				...currentJson,
				_nodeSettings: nodeParameters,
				_evaluatedSettings: evaluatedParameters,
			}
		}

		/**
		 * ToDo: parse the projekt so each input item maps to a new object where the column key shows to its input value?
		 */

		return [items]

		// let item: INodeExecutionData;
		// let myString: string;

		// // Iterates over all input items and add the key "myString" with the
		// // value the parameter "myString" resolves to.
		// // (This could be a different value for each item in case it contains an expression)
		// for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		// 	try {
		// 		myString = this.getNodeParameter('myString', itemIndex, '') as string;
		// 		item = items[itemIndex];

		// 		item.json.myString = myString;
		// 	} catch (error) {
		// 		// This node should never fail but we want to showcase how
		// 		// to handle errors.
		// 		if (this.continueOnFail()) {
		// 			items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
		// 		} else {
		// 			// Adding `itemIndex` allows other workflows to handle this error
		// 			if (error.context) {
		// 				// If the error thrown already contains the context property,
		// 				// only append the itemIndex
		// 				error.context.itemIndex = itemIndex;
		// 				throw error;
		// 			}
		// 			throw new NodeOperationError(this.getNode(), error, {
		// 				itemIndex,
		// 			});
		// 		}
		// 	}
		// }

		// return [items];
	}
}
