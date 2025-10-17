import { z } from 'zod';

const ZColumnType = z.enum([
    //mandatory columns
    "name",
    // regular columns
    "text",
    "number",
    "date",
    "checkbox",
    "interval",
    "phone",
    "email",
    "address",
    "rating-stars",
    "erneut-kontaktieren",
    "link",
    "personName",
    "zeitauswertung",
    "formel",
    // columns with options
    "status",
    "dokument",
    // project special columns
    "kunde",
    "teamMember",
    "aufgaben",
    "cloud",
    "lager",
]);
const ZColumn = z.object({
    columnKey: z.string(),
    label: z.string(),
    columnType: ZColumnType,
    columnJSON: z.string().optional(), // For additional column options
    deactivated: z.boolean().optional(), // Instead of deleting columns only deactivate them to prevent users from shotting themself in the leg
    disableEditing: z.boolean().optional(), // For showing rows, but preventing users from editing them
});
const ZBoard = z.object({
    boardId: z.number().int(),
    name: z.string(),
    columnSchema: ZColumn.array(),
});
const ZListBoardsOutput = z.object({
    boardGroups: z
        .object({
        groupName: z.string(),
        boards: z
            .discriminatedUnion("type", [
            z.object({
                type: z.literal("board"),
                board: ZBoard,
            }),
            z.object({
                type: z.literal("group"),
                groupId: z.string(),
                groupName: z.string(),
                boards: z.array(ZBoard),
            }),
        ])
            .array(),
    })
        .array(),
});

const apiSchema_v1 = {
    board: {
        listBoards: {
            method: "GET",
            pathname: "/api/v1/board/list-boards",
            inputSchema: z.null(),
            outputSchema: ZListBoardsOutput,
        },
    },
};

export { apiSchema_v1 };
//# sourceMappingURL=api.ts.map
