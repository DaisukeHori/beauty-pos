// Mock Supabase client
jest.mock('../client', () => ({
  getSupabaseClient: jest.fn(() => mockSupabaseClient),
}));

// Create chainable mock for Supabase query builder
export const createMockQueryBuilder = (data: unknown[] = [], error: Error | null = null) => {
  const builder: Record<string, jest.Mock> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'contains',
    'or', 'and', 'not', 'filter',
    'order', 'limit', 'range', 'single', 'maybeSingle',
  ];

  chainMethods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });

  // Terminal methods that return data
  builder.then = jest.fn().mockImplementation((resolve) => {
    resolve({ data, error, count: data.length });
    return Promise.resolve({ data, error, count: data.length });
  });

  // Make it thenable
  Object.defineProperty(builder, 'then', {
    value: (resolve: (value: unknown) => void) => {
      const result = { data, error, count: data.length };
      resolve(result);
      return Promise.resolve(result);
    },
  });

  return builder;
};

// Mock Supabase client
export const mockSupabaseClient = {
  from: jest.fn((table: string) => createMockQueryBuilder()),
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
  functions: {
    invoke: jest.fn(),
  },
  rpc: jest.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
