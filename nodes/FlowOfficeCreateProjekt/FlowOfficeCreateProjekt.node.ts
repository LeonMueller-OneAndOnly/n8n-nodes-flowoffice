import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { apiSchema_v1 } from '../../lib/api-schema';
import type { z } from 'zod';
import { ZListBoardsOutput } from '../../lib/api-schema/board';

const FallbackBaseUrl = 'https://api.flow-office.eu';

export class FlowOfficeCreateProjekt implements INodeType {
	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const creds = (await this.getCredentials('flowOfficeApi')) as {
					apiKey: string;
					baseUrl?: string;
				};
				const baseUrl = (creds.baseUrl || FallbackBaseUrl).replace(/\/$/, '');
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'flowOfficeApi',
					{
						method: 'GET',
						url: baseUrl + apiSchema_v1.board.listBoards.pathname,
					},
				);

				type ListBoardsOutput = z.infer<typeof ZListBoardsOutput>;
				const parsed = apiSchema_v1.board.listBoards.schema.parse(response) as ListBoardsOutput;
				const options: INodePropertyOptions[] = [];

				for (const topGroup of parsed.boardGroups) {
					for (const item of topGroup.boards) {
						if (item.type === 'board') {
							options.push({
								name: `${topGroup.groupName} / ${item.board.name}`,
								value: item.board.boardId,
							});
						} else {
							for (const board of item.boards) {
								options.push({
									name: `${topGroup.groupName} / ${item.groupName} / ${board.name}`,
									value: board.boardId,
								});
							}
						}
					}
				}

				return options;
			},
		},
	};
	description: INodeTypeDescription = {
		displayName: 'FlowOffice: Create Projekt',
		name: 'flowOfficeCreateProjekt',
		icon: {
			light: 'file:FlowOfficeCreateProjekt.svg',
			dark: 'file:FlowOfficeCreateProjekt.dark.svg',
		},
		group: ['input'],
		version: 1,
		description: 'Create a projekt in FlowOffice',
		defaults: {
			name: 'FlowOffice: Create Projekt',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'flowOfficeApi',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Board Name or ID',
				placeholder: 'Select a board',
				name: 'projekt-board',
				// description: 'The description text',
				type: 'options',
				description:
					'Choose from the list, or specify a Board-ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				default: '',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'listBoards',
				},
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		let myString: string;

		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				myString = this.getNodeParameter('myString', itemIndex, '') as string;
				item = items[itemIndex];

				item.json.myString = myString;
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [items];
	}
}
