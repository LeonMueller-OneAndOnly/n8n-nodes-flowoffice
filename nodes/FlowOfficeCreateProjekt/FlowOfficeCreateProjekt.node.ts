import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { buildOptions_boardId, buildOptions_columnsForBoard } from '../../lib/buildBoardOptions';
import { fetchBoards } from '../../lib/fetchBoards';

// Base URL resolution handled in fetchBoards

export class FlowOfficeCreateProjekt implements INodeType {
	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const boards = await fetchBoards(this);
				return buildOptions_boardId(boards);
			},
			async listColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter('projekt-board');
				if (selectedBoardId === undefined || selectedBoardId === '') return [];

				const boards = await fetchBoards(this);

				const boardIdNum =
					typeof selectedBoardId === 'string'
						? parseInt(selectedBoardId, 10)
						: (selectedBoardId as number);

				return buildOptions_columnsForBoard(boards, boardIdNum);
			},
		},
	};
	description: INodeTypeDescription = {
		displayName: 'Create Projekt (FlowOffice)',
		name: 'flowOfficeCreateProjekt',
		icon: {
			light: 'file:FlowOfficeCreateProjekt.svg',
			dark: 'file:FlowOfficeCreateProjekt.dark.svg',
		},
		group: ['input'],
		version: 1,
		description: 'Create a project in FlowOffice',
		defaults: {
			name: 'Create Project (FlowOffice)',
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
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'listBoards',
				},
			},
			{
				displayName: 'Column Mappings',
				name: 'columnMappings',
				description: 'Map input fields to board columns',
				type: 'fixedCollection',
				placeholder: 'Add column mapping',
				default: { mappings: [] },
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Mappings',
						name: 'mappings',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'columnKey',
								type: 'options',
								required: true,
								typeOptions: {
									loadOptionsMethod: 'listColumns',
									loadOptionsDependsOn: ['projekt-board'],
								},
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Use expressions to map from input JSON',
							},
						],
					},
				],
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return [items];

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
