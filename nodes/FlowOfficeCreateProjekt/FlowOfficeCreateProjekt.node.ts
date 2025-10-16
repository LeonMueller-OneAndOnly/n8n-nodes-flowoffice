import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	buildOptions_boardId,
	buildOptions_columnsForBoard_nonStatus,
	buildOptions_columnsForBoard_statusOnly,
} from '../../lib/buildBoardOptions';
import { buildOptions_statusLabels } from '../../lib/buildStatusOptions';
import { fetchBoards } from '../../lib/fetchBoards';

// Base URL resolution handled in fetchBoards

export class FlowOfficeCreateProjekt implements INodeType {
	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const boards = await fetchBoards(this);
				return buildOptions_boardId(boards);
			},
			async listColumnsNonStatus(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter('projekt-board');
				if (selectedBoardId === undefined || selectedBoardId === '') return [];

				const boards = await fetchBoards(this);

				const boardIdNum =
					typeof selectedBoardId === 'string'
						? parseInt(selectedBoardId, 10)
						: (selectedBoardId as number);

				return buildOptions_columnsForBoard_nonStatus(boards, boardIdNum);
			},
			async listColumnsStatusOnly(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter('projekt-board');
				if (selectedBoardId === undefined || selectedBoardId === '') return [];

				const boards = await fetchBoards(this);

				const boardIdNum =
					typeof selectedBoardId === 'string'
						? parseInt(selectedBoardId, 10)
						: (selectedBoardId as number);

				return buildOptions_columnsForBoard_statusOnly(boards, boardIdNum);
			},
			async listStatusLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter('projekt-board');
				if (selectedBoardId === undefined || selectedBoardId === '') return [];

				// Try to get the sibling columnKey from the current mapping row first
				let columnKey = this.getCurrentNodeParameter('columnKey') as string | undefined;

				// Fallback to last mapping's columnKey if sibling lookup is not available
				if (!columnKey) {
					const mapping = this.getCurrentNodeParameter('statusColumnMappings') as
						| { mappings?: Array<{ columnKey?: string }> }
						| undefined;
					columnKey = mapping?.mappings?.[mapping.mappings.length - 1]?.columnKey as
						| string
						| undefined;
				}

				if (!columnKey) return [];

				const boards = await fetchBoards(this);
				const boardIdNum =
					typeof selectedBoardId === 'string'
						? parseInt(selectedBoardId, 10)
						: (selectedBoardId as number);
				return buildOptions_statusLabels(boards, boardIdNum, columnKey);
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
				displayName: 'Column Mappings (Non-Status-Columns)',
				name: 'columnMappings',
				description: 'Map input fields to non-status columns',
				hint: 'Note: Status columns are mapped separately below',
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
									loadOptionsMethod: 'listColumnsNonStatus',
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

			{
				displayName: 'Column Mappings (Status-Columns Only)',
				name: 'statusColumnMappings',
				description: 'Map input fields to status-columns only',
				hint: 'Note: Only status columns are available here; non-status columns are above',
				type: 'fixedCollection',
				placeholder: 'Add status column mapping',
				default: { mappings: [] },
				typeOptions: { multipleValues: true },
				options: [
					{
						displayName: 'Mappings',
						name: 'mappings',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'columnKey',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								required: true,
								typeOptions: {
									loadOptionsMethod: 'listColumnsStatusOnly',
									loadOptionsDependsOn: ['projekt-board'],
								},
								default: '',
							},
							{
								displayName: 'Label Name or ID',
								name: 'statusLabel',
								type: 'options',
								default: '',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'listStatusLabels',
									loadOptionsDependsOn: [
										'projekt-board',
										// Refresh when the selected status column changes
										'statusColumnMappings.mappings.columnKey',
									],
								},
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
