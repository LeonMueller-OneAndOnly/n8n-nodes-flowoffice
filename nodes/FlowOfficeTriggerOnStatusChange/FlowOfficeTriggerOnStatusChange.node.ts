import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
} from "n8n-workflow"
import { NodeConnectionTypes, NodeOperationError } from "n8n-workflow"

import { invokeEndpoint } from "../../src/transport/invoke-api"
import { n8nApi_v1 } from "../../src/transport/api-schema-bundled/api"
import { helper } from "../../src/transport/api-schema-bundled/helper"

import {
	buildOptions_boardId,
	buildOptions_subboardId,
	buildOptions_columnsForBoard_statusOnly,
	getBoardById,
} from "../../src/build-options/buildBoardOptions"

import { tryTo_async } from "../../src/utils/try"
import z from "zod"

const EmptyStatusColumnName = "(no status column selected)"
const NoStatusColumnSelectedOption: INodePropertyOptions = {
	name: EmptyStatusColumnName,
	value: EmptyStatusColumnName,
	description: "No status column selected",
}

export class FlowOfficeTriggerOnProjectStatusChange implements INodeType {
	description: INodeTypeDescription = {
		version: 1,
		name: "flowOfficeTriggerOnStatusChange",
		icon: {
			light: "file:FlowOfficeTriggerOnStatusChange.svg",
			dark: "file:FlowOfficeTriggerOnStatusChange.dark.svg",
		},
		group: ["trigger"],
		displayName: "Trigger on Project Status Change (FlowOffice)",
		description: "Trigger on project status change event",
		subtitle: undefined, // "={{$parameter.boardId}}",
		defaults: {
			name: "Trigger on Project Status Change (FlowOffice)",
		},

		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: undefined,

		credentials: [
			{
				name: "flowOfficeApi",
				required: true,
			},
		],
		webhooks: [
			{
				name: "default",
				httpMethod: "POST",
				responseMode: "onReceived",
				path: "webhook",
			},
		],

		// ------------------------------

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

			{
				displayName: "Status Column Name or ID",
				name: "statusColumnKey",
				type: "options",
				default: "",
				description:
					'Select a status column to filter by, then choose its labels below. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',

				required: true,
				displayOptions: {
					hide: {
						boardId: [""],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId"],
					loadOptionsMethod: "listStatusColumns",
				},
				hint: "Select the status column to watch. The FROM/TO label filters below are optional — leave them empty to match ANY.",
			},

			{
				displayName: "When FROM Status Is In",
				name: "fromStatusLabels",
				type: "multiOptions",
				default: [],
				options: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				placeholder: "Leave empty for ANY from-status",
				hint: "Optional. Trigger when the previous (FROM) status matches any selected label. Leave empty to match ANY from-status. The node triggers if either FROM or TO filters match.",
				displayOptions: {
					hide: {
						boardId: [""],
						statusColumnKey: ["", EmptyStatusColumnName],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId", "statusColumnKey"],
					loadOptionsMethod: "listStatusLabels",
				},
			},

			{
				displayName: "When TO Status Is In",
				name: "toStatusLabels",
				type: "multiOptions",
				default: [],
				options: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				placeholder: "Leave empty for ANY to-status",
				hint: "Optional. Trigger when the new (TO) status matches any selected label. Leave empty to match ANY to-status. The node triggers if either FROM or TO filters match.",
				displayOptions: {
					hide: {
						boardId: [""],
						statusColumnKey: ["", EmptyStatusColumnName],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ["boardId", "statusColumnKey"],
					loadOptionsMethod: "listStatusLabels",
				},
			},
		],
	}

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData("node")

				if (webhookData.webhookId === undefined) {
					return false
				}
				// try {
				// 	await baserowApiRequest.call(
				// 		this,
				// 		"GET",
				// 		`/api/database/webhooks/${webhookData.webhookId}/`,
				// 	)
				// } catch (error) {
				// 	if (error.response.status === 404) {
				// 		delete webhookData.webhookId
				// 		delete webhookData.webhookEvents
				// 		return false
				// 	}
				// 	throw error
				// }
				return true
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl("default") as string

				if (webhookUrl.includes("//localhost")) {
					throw new NodeOperationError(
						this.getNode(),
						'The Webhook can not work on "localhost". Please, either setup n8n on a custom domain or start with "--tunnel"!',
					)
				}

				const boardId = this.getNodeParameter("boardId") as string

				// const body = {
				// 	url: webhookUrl,
				// 	include_all_events: false,
				// 	events,
				// 	request_method: "POST",
				// 	name: `${this.getWorkflow().name}`,
				// 	use_user_field_names: true,
				// }

				// const webhookData = this.getWorkflowStaticData("node")

				// const apiResponse = await invokeEndpoint(n8nApi_v1.endpoints.webhook.create, {
				// 	thisArg: this,
				// 	body,
				// })

				// if (responseData.id === undefined || responseData.active !== true) {
				// 	throw new NodeApiError(this.getNode(), responseData, {
				// 		message: "Baserow webhook creation response did not contain the expected data.",
				// 	})
				// }

				// webhookData.webhookId = responseData.id as string
				// webhookData.webhookEvents = responseData.events as string[]

				return true
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = getWebhookData_fromWorkflowStaticData({ this: this })

				// if (webhookData.webhookId !== undefined) {
				// 	const endpoint = `/api/database/webhooks/${webhookData.webhookId}/`
				// 	const body = {}
				// 	try {
				// 		await baserowApiRequest.call(this, "DELETE", endpoint, body)
				// 	} catch (error) {
				// 		if (error.response.status !== 404) {
				// 			return false
				// 		}
				// 	}
				// 	delete webhookData.webhookId
				// 	delete webhookData.webhookEvents
				// }
				return true
			},
		},
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData()
		if (bodyData.hook_id !== undefined && bodyData.action === undefined) {
			return {
				webhookResponse: "OK",
			}
		}

		const returnData: IDataObject[] = []

		returnData.push({
			body: bodyData,
		})

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		}
	}

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
}

const ZWebhookData = z.object({
	webhookId: z.number(),
	// TODO: filter options etc.
})

type TWebhookData = z.infer<typeof ZWebhookData>

function setWebhookData_inWorkflowStaticData(input: {
	this: IHookFunctions
	webhookData: TWebhookData
}) {
	const webhookData = input.this.getWorkflowStaticData("node")

	for (const key in input.webhookData) {
		webhookData[key] = input.webhookData[key as keyof typeof input.webhookData]
	}
}

function getWebhookData_fromWorkflowStaticData(input: {
	this: IHookFunctions
}): TWebhookData | null {
	const webhookData = input.this.getWorkflowStaticData("node")

	const parseResult = ZWebhookData.safeParse(webhookData)
	if (!parseResult.success) {
		return null
	}
	return parseResult.data
}
