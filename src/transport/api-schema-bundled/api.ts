import { z } from 'zod';

const ZColumnType$1 = z.enum([
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
const ZColumn$1 = z.object({
    columnKey: z.string(),
    label: z.string(),
    columnType: ZColumnType$1,
    columnJSON: z.string().optional(), // For additional column options
    deactivated: z.boolean().optional(), // Instead of deleting columns only deactivate them to prevent users from shotting themself in the leg
    disableEditing: z.boolean().optional(), // For showing rows, but preventing users from editing them
});
const ZBoard = z.object({
    boardId: z.number().int(),
    name: z.string(),
    columnSchema: ZColumn$1.array(),
    subboards: z.object({
        name: z.string(),
        subboardId: z.number().int(),
    }),
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
z.array(ZColumn);
z.object({
    headerLabel: z.string().min(1, { message: "Geben Sie einen Namen ein" }),
    type: ZColumnType,
});

const ZCreateProjectsInput = z.object({
    projects_mappedcolumnKey_toValue: z.record(z.string(), z.unknown()).array(),
    boardId: z.number().int(),
    subBoardId: z.number().int(),
});
const ZCreateProjectsOutput = z.object({
    projekte: z
        .object({
        dbId: z.number().int(),
        uuid: z.string(),
    })
        .array(),
});

const n8nApi_v1 = {
    endpoints: {
        board: {
            listBoards: {
                method: "GET",
                pathname: "/api/v1/board/list-boards",
                inputSchema: z.null(),
                outputSchema: ZListBoardsOutput,
            },
        },
        project: {
            createProjects: {
                method: "POST",
                pathname: "/api/v1/project/create-projects",
                inputSchema: ZCreateProjectsInput,
                outputSchema: ZCreateProjectsOutput,
            },
        },
    },
    schemas: {
        ZColumnType: ZColumnType,
    },
};

export { n8nApi_v1 };
//# sourceMappingURL=api.ts.map
