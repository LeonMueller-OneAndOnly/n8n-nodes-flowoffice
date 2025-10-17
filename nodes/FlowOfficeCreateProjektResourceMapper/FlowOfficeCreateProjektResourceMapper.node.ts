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
	IDataObject,
} from "n8n-workflow"
import { NodeConnectionTypes } from "n8n-workflow"

import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"
import { helper } from "../../src/transport/api-schema-bundled/helper"
import { buildOptions_boardId, getBoardById } from "../../src/build-options/buildBoardOptions"

import z from "zod"
import { getColumnTypeDisplayName } from "../../src/column-type-display-name"

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
				): FieldType | null => {
					switch (columnType) {
						case "status":
							return "options"

						case "number":
						case "rating-stars":
						case "interval": // TODO: specify unit (seconds?)
							return "number"

						case "date":
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

						case "cloud":
						case "kunde":
						case "aufgaben":
						case "cloud":
						case "teamMember":
							return null

						case "zeitauswertung":
						case "formel":
						case "dokument":
						case "lager":
						case "formel":
						case "dokument":
						case "lager":
							return null

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
						displayName: `${aCol.label} (${getColumnTypeDisplayName(aCol.columnType)})`,
						defaultMatch: aCol.columnType === "name",
						canBeUsedToMatch: aCol.columnType === "name",
						required: aCol.columnType === "name",
						display: true,
						readOnly: type === null,
						type: type ?? undefined,
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
				allowArbitraryValues: true,
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
					loadOptionsDependsOn: ["boardId"],
					resourceMapper: {
						valuesLabel: "Column mapping",
						resourceMapperMethod: "getBoardSchemaForResourceMapper",
						mode: "add",
						fieldWords: { singular: "column", plural: "columns" },
						addAllFields: true,
						supportAutoMap: false,
						showTypeConversionOptions: false,
						noFieldsError: "Select a board first to load its columns.",
					},
				},
			},
		],
	}

	// The function below is responsible for actually doing whatever this node is supposed to do.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const boardId = z.coerce
			.number()
			.int()
			.parse(this.getNodeParameter("boardId", 0, "not-defined"))

		const inputItems = this.getInputData()

		const outputItems: INodeExecutionData[] = []
		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
			const resourceMapper = this.getNodeParameter("resourceMapper", itemIndex, {}) as
				| { value?: Record<string, unknown> | null }
				| undefined

			const mapped: IDataObject =
				resourceMapper &&
				typeof resourceMapper === "object" &&
				resourceMapper.value &&
				typeof resourceMapper.value === "object"
					? (resourceMapper.value as unknown as IDataObject)
					: ({} as IDataObject)

			outputItems.push({
				json: { mapped, boardId },
				error: undefined,
				pairedItem: { item: itemIndex },
			})
		}

		return [outputItems]
	}
}
