import React, { useState, useEffect } from 'react';
import api from '../api/client';

interface ExpenseCategory {
  id: number;
  code: string;
  name: string;
}

interface ExpenseFormProps {
  storeId: number;
  onSuccess: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ storeId, onSuccess }) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [formData, setFormData] = useState({
    expenseCategoryId: 0,
    amount: '',
    description: '',
    paymentMethod: 'CASH', // Mặc định tiền mặt
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/expenses/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, expenseCategoryId: response.data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post('/expenses', {
        storeId,
        expenseCategoryId: formData.expenseCategoryId,
        amount: parseFloat(formData.amount),
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        expenseDate: new Date().toISOString().split('T')[0],
      });

      setFormData({ expenseCategoryId: categories[0]?.id || 0, amount: '', description: '', paymentMethod: 'CASH' });
      onSuccess();
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Lỗi khi tạo chi phí');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold">Thêm Chi Phí</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Loại chi phí
        </label>
        <select
          value={formData.expenseCategoryId}
          onChange={(e) => setFormData({ ...formData, expenseCategoryId: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          required
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.code} - {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Số tiền
        </label>
        <input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="0"
          min="0"
          step="0.01"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Loại thanh toán
        </label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="CASH">💵 Tiền mặt</option>
          <option value="BANK_TRANSFER">🏦 Chuyển khoản</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Diễn giải
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder="Nhập mô tả chi phí..."
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
      >
        Thêm Chi Phí
      </button>
    </form>
  );
};
