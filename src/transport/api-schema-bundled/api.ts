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
const ZColumn = z.object({
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
    columnSchema: ZColumn.array(),
    subboards: z
        .object({
        name: z.string(),
        subboardId: z.number().int(),
    })
        .array(),
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
        name: z.string(),
        cells: z.record(z.string(), z.object({
            columnKey: z.string(),
            columnLabel: z.string(),
            columnType: ZColumnType$1,
            cellValue: z.union([
                z.object({ labelId: z.string(), labelValue: z.string() }),
                z.unknown(),
            ]),
        })),
    })
        .array(),
});
const ZGetProjectsInput = z.object({
    name: z.string().optional(),
    boardId: z.number().int().optional(),
    subBoardId: z.number().int().optional(),
    projektId: z.union([z.number().int(), z.array(z.number().int())]).optional(),
    projektUuid: z.union([z.string(), z.array(z.string())]).optional(),
    status: z
        .object({
        statusColumnKey: z.string().optional(),
        filterLabels_keyOrName: z.string().array().optional(),
    })
        .optional(),
    // Pagination
    skip: z.number().int().min(0).optional(),
});
const ZGetProjectsOutput = z.object({
    projects: z
        .object({
        dbId: z.number().int(),
        uuid: z.string(),
        name: z.string(),
        cells: z.record(z.string(), z.object({
            columnKey: z.string(),
            columnLabel: z.string(),
            columnType: ZColumnType$1,
            cellValue: z.union([
                z.object({ labelId: z.string(), labelValue: z.string() }),
                z.unknown(),
            ]),
        })),
    })
        .array(),
    nextPage: z.object({ skip: z.number().int() }),
    hitLimit: z.boolean(),
});
const ZProjectStatusChangedEvent = z.object({
    type: z.literal("project.status.changed"),
    deliveryId: z.string(),
    projektId: z.number().int(),
    boardId: z.number().int(),
    subBoardId: z.number().int(),
    status: z.object({
        columnKey: z.string(),
        columnLabel: z.string(),
        from: z.object({
            labelKey: z.string(),
            labelName: z.string(),
        }),
        to: z.object({
            labelKey: z.string(),
            labelName: z.string(),
        }),
        occurredAt: z.string(),
    }),
    cells: z.record(z.string(), z.unknown()),
});

// Schemas for the "projekt-status-changed" webhook subscription lifecycle
const ZWebhook_ProjectStatusChanged_UpsertInput = z.object({
    url: z.string().url(),
    boardId: z.number().int(),
    statusColumnKey: z.string(),
    subBoardId: z.number().int().nullable().optional(),
    fromStatusLabelKeys: z.array(z.string()).optional(),
    toStatusLabelKeys: z.array(z.string()).optional(),
    name: z.string().optional(),
    signingSecret: z.string().min(24),
    configHash: z.string().min(16),
});
const ZWebhook_ProjectStatusChanged_UpsertOutput = z.object({
    id: z.string(),
    active: z.boolean(),
    configHash: z.string(),
    // Dates are serialized to ISO strings in JSON responses
    createdAt: z.string(),
    updatedAt: z.string(),
});
const ZWebhook_ProjectStatusChanged_GetOutput = z.object({
    id: z.string(),
    active: z.boolean(),
    configHash: z.string(),
});
const ZWebhook_ProjectStatusChanged_DeleteOutput = z.null();

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
            getProjects: {
                method: "POST",
                pathname: "/api/v1/project/get-projects",
                inputSchema: ZGetProjectsInput,
                outputSchema: ZGetProjectsOutput,
            },
        },
    },
    webhooks: {
        projectStatusChanged: {
            upsert: {
                method: "PUT",
                pathname: "/api/v1/webhooks/subscriptions/projekt-status-changed/[subscriptionId]",
                inputSchema: ZWebhook_ProjectStatusChanged_UpsertInput,
                outputSchema: ZWebhook_ProjectStatusChanged_UpsertOutput,
            },
            get: {
                method: "GET",
                pathname: "/api/v1/webhooks/subscriptions/projekt-status-changed/[subscriptionId]",
                inputSchema: z.null(),
                outputSchema: ZWebhook_ProjectStatusChanged_GetOutput,
            },
            delete: {
                method: "DELETE",
                pathname: "/api/v1/webhooks/subscriptions/projekt-status-changed/[subscriptionId]",
                inputSchema: z.null(),
                outputSchema: ZWebhook_ProjectStatusChanged_DeleteOutput,
            },
            webhookPayload: ZProjectStatusChangedEvent,
        },
    },
    schemas: {
        ZColumnType: ZColumnType,
    },
};

export { n8nApi_v1 };
//# sourceMappingURL=api.ts.map
