export type SupabaseMockError = {
  code?: string;
  message: string;
};

export type SupabaseQueryOperation = "select" | "insert" | "update" | "upsert" | "delete";

export type SupabaseQueryFilter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "is"; column: string; value: unknown }
  | { type: "ilike"; column: string; pattern: string }
  | { type: "or"; expression: string };

export type SupabaseQueryOrder = { column: string; ascending: boolean };

export type SupabaseQueryContext = {
  table: string;
  operation: SupabaseQueryOperation;
  select: string | null;
  values: unknown;
  operationOptions: unknown | null;
  filters: SupabaseQueryFilter[];
  order: SupabaseQueryOrder[];
  limit: number | null;
  count: "exact" | "planned" | "estimated" | null;
  single: "single" | "maybeSingle" | null;
};

export type SupabaseQueryResult = {
  data: unknown;
  error: SupabaseMockError | null;
  count?: number | null;
};

export type SupabaseRpcResult = {
  data: unknown;
  error: SupabaseMockError | null;
};

export type SupabaseQueryHandler = (
  ctx: Readonly<SupabaseQueryContext>,
) => SupabaseQueryResult | Promise<SupabaseQueryResult>;

export type SupabaseRpcHandler = (args: {
  fn: string;
  params: Record<string, unknown>;
}) => SupabaseRpcResult | Promise<SupabaseRpcResult>;

class SupabaseQueryBuilderMock {
  private ctx: SupabaseQueryContext;

  constructor(
    private supabase: SupabaseMock,
    table: string,
  ) {
    this.ctx = {
      table,
      operation: "select",
      select: null,
      values: null,
      operationOptions: null,
      filters: [],
      order: [],
      limit: null,
      count: null,
      single: null,
    };
  }

  select(columns: string, options?: { count?: "exact" | "planned" | "estimated" }): this {
    this.ctx.select = columns;
    this.ctx.count = options?.count ?? this.ctx.count;
    return this;
  }

  insert(values: unknown): this {
    this.ctx.operation = "insert";
    this.ctx.values = values;
    this.ctx.operationOptions = null;
    return this;
  }

  update(values: unknown): this {
    this.ctx.operation = "update";
    this.ctx.values = values;
    this.ctx.operationOptions = null;
    return this;
  }

  upsert(values: unknown, options?: unknown): this {
    this.ctx.operation = "upsert";
    this.ctx.values = values;
    this.ctx.operationOptions = options ?? null;
    return this;
  }

  delete(): this {
    this.ctx.operation = "delete";
    this.ctx.operationOptions = null;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.ctx.filters.push({ type: "eq", column, value });
    return this;
  }

  is(column: string, value: unknown): this {
    this.ctx.filters.push({ type: "is", column, value });
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.ctx.filters.push({ type: "ilike", column, pattern });
    return this;
  }

  or(expression: string): this {
    this.ctx.filters.push({ type: "or", expression });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.ctx.order.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(value: number): this {
    this.ctx.limit = value;
    return this;
  }

  maybeSingle(): Promise<SupabaseQueryResult> {
    this.ctx.single = "maybeSingle";
    return this.supabase.__executeQuery(this.ctx);
  }

  single(): Promise<SupabaseQueryResult> {
    this.ctx.single = "single";
    return this.supabase.__executeQuery(this.ctx);
  }

  then<TResult1 = SupabaseQueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseQueryResult) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Promise<TResult1 | TResult2> {
    return this.supabase.__executeQuery(this.ctx).then(onfulfilled, onrejected);
  }
}

export type SupabaseMock = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: SupabaseMockError | null;
    }>;
  };
  from: (table: string) => SupabaseQueryBuilderMock;
  rpc: (fn: string, params: Record<string, unknown>) => Promise<SupabaseRpcResult>;
  __setQueryHandler: (key: string, handler: SupabaseQueryHandler) => void;
  __setRpcHandler: (fn: string, handler: SupabaseRpcHandler) => void;
  __calls: {
    queries: SupabaseQueryContext[];
    rpcs: Array<{ fn: string; params: Record<string, unknown> }>;
  };
  __executeQuery: (ctx: SupabaseQueryContext) => Promise<SupabaseQueryResult>;
};

export function createSupabaseMock(args?: {
  userId?: string | null;
  authError?: SupabaseMockError | null;
}): SupabaseMock {
  const userId = args?.userId === undefined ? "user_1" : args.userId;
  const authError = args?.authError ?? null;

  const queryHandlers = new Map<string, SupabaseQueryHandler>();
  const rpcHandlers = new Map<string, SupabaseRpcHandler>();
  const calls: SupabaseMock["__calls"] = { queries: [], rpcs: [] };

  const supabase: SupabaseMock = {
    auth: {
      async getUser() {
        if (authError) return { data: { user: null }, error: authError };
        return { data: { user: userId ? { id: userId } : null }, error: null };
      },
    },
    from(table: string) {
      return new SupabaseQueryBuilderMock(supabase, table);
    },
    async rpc(fn: string, params: Record<string, unknown>) {
      calls.rpcs.push({ fn, params });
      const handler = rpcHandlers.get(fn);
      if (!handler) {
        return { data: null, error: { message: `No RPC handler registered for ${fn}` } };
      }
      return await handler({ fn, params });
    },
    __setQueryHandler(key: string, handler: SupabaseQueryHandler) {
      queryHandlers.set(key, handler);
    },
    __setRpcHandler(fn: string, handler: SupabaseRpcHandler) {
      rpcHandlers.set(fn, handler);
    },
    __calls: calls,
    async __executeQuery(ctx: SupabaseQueryContext) {
      calls.queries.push({ ...ctx, filters: [...ctx.filters], order: [...ctx.order] });
      const key = `${ctx.table}.${ctx.operation}`;
      const handler = queryHandlers.get(key);
      if (!handler) {
        return { data: null, error: { message: `No query handler registered for ${key}` } };
      }
      return await handler(ctx);
    },
  };

  return supabase;
}
