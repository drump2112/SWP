import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CashCheckingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DENOMINATIONS = [
  { value: 500000, label: '500.000 đ' },
  { value: 200000, label: '200.000 đ' },
  { value: 100000, label: '100.000 đ' },
  { value: 50000, label: '50.000 đ' },
  { value: 20000, label: '20.000 đ' },
  { value: 10000, label: '10.000 đ' },
  { value: 5000, label: '5.000 đ' },
  { value: 2000, label: '2.000 đ' },
  { value: 1000, label: '1.000 đ' },
];

const CashCheckingModal: React.FC<CashCheckingModalProps> = ({ isOpen, onClose }) => {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [transferAmount, setTransferAmount] = useState<number>(0);

  const handleQuantityChange = (denomination: number, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (numValue < 0) return;
    setQuantities((prev) => ({
      ...prev,
      [denomination]: numValue,
    }));
  };

  const calculateCashTotal = () => {
    return DENOMINATIONS.reduce((sum, { value }) => {
      const qty = quantities[value] || 0;
      return sum + qty * value;
    }, 0);
  };

  const cashTotal = calculateCashTotal();
  const grandTotal = cashTotal + transferAmount;

  const handleReset = () => {
    setQuantities({});
    setTransferAmount(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-white border-b p-6">
          <h2 className="text-2xl font-bold text-gray-900">💰 Kiểm Tiền</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Denominations Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Các mệnh giá tiền mặt</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border border-gray-200">Mệnh giá</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border border-gray-200 w-32">Số lượng tờ</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border border-gray-200 w-40">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {DENOMINATIONS.map(({ value, label }) => {
                    const quantity = quantities[value] || 0;
                    const subtotal = quantity * value;
                    return (
                      <tr key={value} className="border-b border-gray-200 hover:bg-blue-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border border-gray-200">{label}</td>
                        <td className="px-4 py-3 border border-gray-200">
                          <input
                            type="number"
                            min="0"
                            value={quantity || ''}
                            onChange={(e) => handleQuantityChange(value, e.target.value)}
                            className="w-full px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border border-gray-200">
                          {subtotal.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transfer Amount */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              💳 Tiền chuyển khoản
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={transferAmount || ''}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                if (val < 0) return;
                setTransferAmount(val);
              }}
              className="w-full px-3 py-2 text-lg border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>

          {/* Summary */}
          <div className="space-y-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Tổng tiền mặt:</span>
              <span className="text-lg font-bold text-green-600">{cashTotal.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Tiền chuyển khoản:</span>
              <span className="text-lg font-bold text-blue-600">{transferAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-3 flex items-center justify-between">
              <span className="text-base font-bold text-gray-900">Tổng cộng:</span>
              <span className="text-2xl font-bold text-purple-600">{grandTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
            >
              Xóa
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashCheckingModal;
