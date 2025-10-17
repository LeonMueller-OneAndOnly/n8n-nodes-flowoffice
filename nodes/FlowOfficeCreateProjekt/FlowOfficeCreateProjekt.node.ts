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
	buildOptions_columnsForBoard_statusOnly,
	buildOptions_columnsForBoard,
} from '../../src/buildBoardOptions';
import { buildOptions_statusLabels } from '../../src/buildStatusOptions';
import { fetchBoards } from '../../src/fetchBoards';

export class FlowOfficeCreateProjekt implements INodeType {
	methods = {
		loadOptions: {
			async listBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const boards = await fetchBoards(this);
				return buildOptions_boardId(boards);
			},
			// async listColumnsAll(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
			// 	const selectedBoardId = this.getCurrentNodeParameter('projekt-board');
			// 	if (selectedBoardId === undefined || selectedBoardId === '') return [];

			// 	const boards = await fetchBoards(this);

			// 	const boardIdNum =
			// 		typeof selectedBoardId === 'string'
			// 			? parseInt(selectedBoardId, 10)
			// 			: (selectedBoardId as number);

			// 	// Return all columns (including status) to simplify UX
			// 	return buildOptions_columnsForBoard(boards, boardIdNum);
			// },
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
			async listColumnsAll(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter('projekt-board');
				if (selectedBoardId === undefined || selectedBoardId === '') return [];

				const boards = await fetchBoards(this);

				const boardIdNum =
					typeof selectedBoardId === 'string'
						? parseInt(selectedBoardId, 10)
						: (selectedBoardId as number);

				return buildOptions_columnsForBoard(boards, boardIdNum);
			},
			async listStatusLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter('projekt-board');
				if (selectedBoardId === undefined || selectedBoardId === '') return [];

				// Prefer the sibling columnKey in the current row
				const columnKey = this.getCurrentNodeParameter('columnKey') as string | undefined;

				const boards = await fetchBoards(this);
				const boardIdNum =
					typeof selectedBoardId === 'string'
						? parseInt(selectedBoardId, 10)
						: (selectedBoardId as number);

				if (!columnKey) return [];
				return buildOptions_statusLabels(boards, boardIdNum, columnKey);
			},
			async getSelectedColumnType(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const selectedBoardId = this.getCurrentNodeParameter('projekt-board');
				const columnKey = this.getCurrentNodeParameter('columnKey') as string | undefined;
				if (selectedBoardId === undefined || selectedBoardId === '' || !columnKey) return [];

				const boards = await fetchBoards(this);
				const boardIdNum =
					typeof selectedBoardId === 'string'
						? parseInt(selectedBoardId, 10)
						: (selectedBoardId as number);

				// find selected column's type
				const board = boards.boardGroups
					.flatMap((g) => g.boards)
					.flatMap((b) => (b.type === 'board' ? [b.board] : b.boards))
					.find((b) => b.boardId === boardIdNum);
				const col = board?.columnSchema.find((c) => c.columnKey === columnKey);
				if (!col) return [];
				return [
					{
						name: col.columnType,
						value: col.columnType,
						description: `Detected type for ${columnKey}`,
					},
				];
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
				description: 'Map input fields to columns. For status columns, select a status label.',
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
									loadOptionsMethod: 'listColumnsAll',
									loadOptionsDependsOn: ['projekt-board'],
								},
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								default: '',
							},
							{
								displayName: 'Column Type (Internal) Name or ID',
								name: 'columnType',
								type: 'options',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'getSelectedColumnType',
									loadOptionsDependsOn: ['projekt-board', 'columnMappings.mappings.columnKey'],
								},
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								displayOptions: {
									show: {
										// never show this helper field to users
										columnKey: ['__never__'],
									},
								},
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Use expressions to map from input JSON (non-status columns)',
								displayOptions: {
									show: {
										columnType: [
											'name',
											'text',
											'number',
											'date',
											'checkbox',
											'interval',
											'phone',
											'email',
											'address',
											'rating-stars',
											'erneut-kontaktieren',
											'link',
											'personName',
											'zeitauswertung',
											'formel',
											'dokument',
											'kunde',
											'teamMember',
											'aufgaben',
											'cloud',
											'lager',
										],
									},
								},
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
										// Refresh when the selected column changes
										'columnMappings.mappings.columnKey',
									],
								},
								displayOptions: {
									show: {
										columnType: ['status'],
									},
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
		const nodeParameters = this.getNode().parameters ?? {};

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];
			if (!item) continue;
			const currentJson = item.json ?? {};
			const evaluatedParameters: Record<string, unknown> = {};
			for (const key of Object.keys(nodeParameters)) {
				try {
					evaluatedParameters[key] = this.getNodeParameter(
						key as string,
						itemIndex,
						(nodeParameters as Record<string, unknown>)[key],
					);
				} catch {
					// Fallback to raw parameter if evaluation is not applicable
					evaluatedParameters[key] = (nodeParameters as Record<string, unknown>)[key];
				}
			}
			item.json = {
				...currentJson,
				_nodeSettings: nodeParameters,
				_evaluatedSettings: evaluatedParameters,
			};
		}

		/**
		 * ToDo: parse the projekt so each input item maps to a new object where the column key shows to its input value?
		 * //
		 */

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
