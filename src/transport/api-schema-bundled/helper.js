import { z } from 'zod';
import superjson from 'superjson';

const ZStatusColumnOptions = z.array(z.object({
    label: z.string(),
    backgroundColor: z.string(),
    enumKey: z.string(),
}));

function parseStatus_columnJson(column) {
    var _a;
    const labels = ZStatusColumnOptions.parse(superjson.parse((_a = column.columnJSON) !== null && _a !== void 0 ? _a : ""));
    return { labels };
}

const helper = {
    parseStatus_columnJson: parseStatus_columnJson,
};

export { helper };
//# sourceMappingURL=helper.js.map
