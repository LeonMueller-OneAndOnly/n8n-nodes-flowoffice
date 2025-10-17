import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ResourceMapperFields,
} from "n8n-workflow"
import { NodeConnectionTypes } from "n8n-workflow"

import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"
import { helper } from "../../src/transport/api-schema-bundled/helper"

import {
	buildOptions_boardId,
	buildOptions_columnsForBoard,
	buildOptions_columnsForBoard_nonStatus,
	buildOptions_columnsForBoard_statusOnly,
	getBoardById,
} from "../../src/build-options/buildBoardOptions"
import { buildOptions_statusLabels } from "../../src/build-options/buildStatusOptions"
import { locales } from "zod"

export class FlowOfficeCreateProjektResourceMapper implements INodeType {
	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				}).then(buildOptions_boardId)
			},
		},

		resourceMapping: {
			async getBoardSchemaForResourceMapper(
				this: ILoadOptionsFunctions,
			): Promise<ResourceMapperFields> {
				const selectedBoardId = this.getCurrentNodeParameter("boardId")
				if (!selectedBoardId || !selectedBoardId) {
					return { fields: [], emptyFieldsNotice: "No board selected." }
				}

				const boards = await invokeEndpoint(n8nApi_v1.endpoints.board.listBoards, {
					thisArg: this,
					body: null,
				})

				const board = getBoardById({ boards, boardId: Number(selectedBoardId) })
				if (!board) return { fields: [], emptyFieldsNotice: "Board not found." }

				const mapColumnTypeToFieldType = (
					columnType: string,
				):
					| "string"
					| "number"
					| "dateTime"
					| "boolean"
					| "time"
					| "array"
					| "object"
					| "options" => {
					switch (columnType) {
						case "number":
							return "number"
						case "date":
							return "dateTime"
						case "checkbox":
							return "boolean"
						case "status":
							return "options"
						// treat the following as strings in the UI
						case "name":
						case "text":
						case "interval":
						case "phone":
						case "email":
						case "address":
						case "rating-stars":
						case "erneut-kontaktieren":
						case "link":
						case "personName":
						case "zeitauswertung":
						case "formel":
						case "dokument":
						case "kunde":
						case "teamMember":
						case "aufgaben":
						case "cloud":
						case "lager":
						default:
							return "string"
					}
				}

				const fieldsFromSchema = board.columnSchema.map((col) => {
					const base: any = {
						id: col.columnKey,
						displayName: col.label,
						defaultMatch: col.columnType === "name",
						canBeUsedToMatch: col.columnType === "name",
						required: col.columnType === "name",
						display: true,
						type: mapColumnTypeToFieldType(col.columnType as string),
					}

					if (col.columnType === "status") {
						const { labels } = helper.parseStatus_columnJson({ columnJSON: col.columnJSON ?? "" })
						base.options = labels.map((l: { label: string; enumKey: string }) => ({
							name: l.label,
							value: l.enumKey,
						}))
					}

					return base
				})

				return {
					fields: fieldsFromSchema,
					emptyFieldsNotice: "No columns found for the selected board.",
				}
			},
		},
	}
	description: INodeTypeDescription = {
		displayName: "Create Projekt Resource Mapper (FlowOffice)",
		name: "flowOfficeCreateProjektResourceMapper",
		icon: {
			light: "file:FlowOfficeCreateProjektResourceMapper.svg",
			dark: "file:FlowOfficeCreateProjektResourceMapper.dark.svg",
		},
		group: ["input"],
		version: 1,
		description: "Map input fields to FlowOffice board columns",
		defaults: {
			name: "Create Project Resource Mapper (FlowOffice)",
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
				displayName: "Fields",
				name: "resourceMapper",
				description: "Map input fields to FlowOffice board columns",
				type: "resourceMapper",
				default: {
					// mappingMode can be defined in the component (mappingMode: 'defineBelow')
					// or you can attempt automatic mapping (mappingMode: 'autoMapInputData')
					mappingMode: "defineBelow",
					// Important: always set default value to null
					value: null,
				},
				required: true,
				displayOptions: {
					hide: {
						boardId: [""],
					},
				},
				typeOptions: {
					resourceMapper: {
						resourceMapperMethod: "getBoardSchemaForResourceMapper",
						mode: "add",
						fieldWords: { singular: "column", plural: "columns" },
						addAllFields: true,
						supportAutoMap: true,
						noFieldsError: "Select a board first to load its columns.",
					},
					loadOptionsDependsOn: ["boardId"],
				},
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
