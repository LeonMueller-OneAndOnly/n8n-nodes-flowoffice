import type {
	FieldType,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ResourceMapperField,
	ResourceMapperFields,
} from "n8n-workflow"
import { NodeConnectionTypes } from "n8n-workflow"

import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"
import { helper } from "../../src/transport/api-schema-bundled/helper"
import { buildOptions_boardId, getBoardById } from "../../src/build-options/buildBoardOptions"

import z from "zod"

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
					columnType: z.infer<typeof n8nApi_v1.schemas.ZColumnType>,
				): FieldType => {
					switch (columnType) {
						case "status":
							return "options"

						case "number":
						case "rating-stars":
							return "number"

						case "date":
						case "interval":
						case "erneut-kontaktieren":
							return "dateTime"

						case "checkbox":
							return "boolean"

						// treat the following as strings in the UI
						case "name":
						case "text":
						case "phone":
						case "email":
						case "address":
						case "personName":
							return "string"

						case "link":
							return "url"

						case "kunde":
						case "aufgaben":
						case "cloud":
							return null

						case "zeitauswertung":
						case "formel":
						case "dokument":
						case "teamMember":
						case "lager":
						default:
							const _never: never = columnType
							return _never
					}
				}

				const fields: ResourceMapperField[] = []

				for (const aCol of board.columnSchema) {
					const type = mapColumnTypeToFieldType(aCol.columnType)

					const aField: ResourceMapperField = {
						id: aCol.columnKey,
						displayName: aCol.label,
						defaultMatch: aCol.columnType === "name",
						canBeUsedToMatch: aCol.columnType === "name",
						required: aCol.columnType === "name",
						display: true,
						type,
						options: (() => {
							if (aCol.columnType === "status") {
								const { labels } = helper.parseStatus_columnJson({
									columnJSON: aCol.columnJSON ?? "",
								})
								return labels.map((l: { label: string; enumKey: string }) => ({
									name: l.label,
									value: l.enumKey,
								}))
							}

							if (type === "options") {
								this.logger.error(
									`Column type ${aCol.columnType} uses the 'options' field type, but does not list any options to choose from`,
								)
							}

							return undefined
						})(),
					}

					fields.push(aField)
				}

				return {
					fields,
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
