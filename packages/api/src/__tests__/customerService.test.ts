import { customerService } from '../services/customerService';
import { mockSupabaseClient, createMockQueryBuilder } from './setup';

describe('customerService', () => {
  const mockCustomer = {
    id: 'customer-1',
    company_id: 'company-1',
    first_name: '太郎',
    last_name: '田中',
    first_name_kana: 'タロウ',
    last_name_kana: 'タナカ',
    phone: '090-1234-5678',
    email: 'tanaka@example.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('search', () => {
    it('should search customers by query', async () => {
      const mockData = [mockCustomer];
      const queryBuilder = createMockQueryBuilder(mockData);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.search('company-1', '田中');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
      expect(queryBuilder.select).toHaveBeenCalledWith('*');
      expect(queryBuilder.eq).toHaveBeenCalledWith('company_id', 'company-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockData);
    });

    it('should return empty array when no query provided', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.search('company-1', '');

      expect(result).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should get all customers for a company', async () => {
      const mockData = [mockCustomer];
      const queryBuilder = createMockQueryBuilder(mockData);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getAll('company-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
      expect(queryBuilder.eq).toHaveBeenCalledWith('company_id', 'company-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(queryBuilder.order).toHaveBeenCalledWith('last_name', { ascending: true });
      expect(result).toEqual(mockData);
    });

    it('should return empty array when no data', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getAll('company-1');

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should get customer by ID', async () => {
      const queryBuilder = createMockQueryBuilder([mockCustomer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: mockCustomer, error: null });
          return Promise.resolve({ data: mockCustomer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.getById('customer-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'customer-1');
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      const newCustomer = {
        company_id: 'company-1',
        customer_code: 'C-002',
        first_name: '花子',
        last_name: '山田',
        phone: '080-1234-5678',
      };

      const createdCustomer = { ...mockCustomer, ...newCustomer, id: 'customer-2' };
      const queryBuilder = createMockQueryBuilder([createdCustomer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: createdCustomer, error: null });
          return Promise.resolve({ data: createdCustomer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.create(newCustomer);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
      expect(queryBuilder.insert).toHaveBeenCalled();
      expect(result).toEqual(createdCustomer);
    });
  });

  describe('update', () => {
    it('should update customer', async () => {
      const updates = { phone: '070-9999-8888' };
      const updatedCustomer = { ...mockCustomer, ...updates };

      const queryBuilder = createMockQueryBuilder([updatedCustomer]);
      queryBuilder.single = jest.fn().mockReturnValue({
        then: (resolve: (value: unknown) => void) => {
          resolve({ data: updatedCustomer, error: null });
          return Promise.resolve({ data: updatedCustomer, error: null });
        },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const result = await customerService.update('customer-1', updates);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
      expect(queryBuilder.update).toHaveBeenCalled();
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'customer-1');
      expect(result).toEqual(updatedCustomer);
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete customer by setting is_active to false', async () => {
      const deletedCustomer = { ...mockCustomer, is_active: false };

      const queryBuilder = createMockQueryBuilder([deletedCustomer]);
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      await customerService.delete('customer-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      );
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'customer-1');
    });
  });
});
