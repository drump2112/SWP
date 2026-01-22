import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../api/products';

export interface CompartmentData {
  compartmentNumber: number;
  productId?: number;
  compartmentHeight: number;
  truckTemperature: number;
  truckVolume: number;
  warehouseHeight: number;
  actualTemperature: number;
  receivedVolume: number;
  heightLossTruck?: number;
  heightLossWarehouse?: number;
}

export interface InventoryImportFormData {
  docDate: string;
  supplierName: string;
  invoiceNumber: string;
  licensePlate: string;
  driverName?: string;
  driverPhone?: string;
  compartments: CompartmentData[];
  notes?: string;
  // Legacy fields (for backward compatibility)
  productId?: number;
  quantity?: number;
}

interface Props {
  onSubmit: (data: InventoryImportFormData) => void;
  onCancel: () => void;
  initialData?: {
    id?: string;
    docDate?: string;
    supplierName?: string;
    invoiceNumber?: string;
    licensePlate?: string;
    driverName?: string;
    driverPhone?: string;
    compartments?: CompartmentData[];
    notes?: string;
    productId?: number;
    quantity?: number;
  };
}

const TruckInventoryImportForm: React.FC<Props> = ({ onSubmit, onCancel, initialData }) => {
  const [docDate, setDocDate] = useState(initialData?.docDate || new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState(initialData?.supplierName || '');
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');
  const [licensePlate, setLicensePlate] = useState(initialData?.licensePlate || '');
  const [driverName, setDriverName] = useState(initialData?.driverName || '');
  const [productId, setProductId] = useState<number>(initialData?.productId || (initialData?.compartments?.[0]?.productId || 0));
  const [quantity, setQuantity] = useState(initialData?.quantity || (initialData?.compartments?.reduce((sum, c) => sum + (c.receivedVolume || 0), 0) || 0));
  const [notes, setNotes] = useState(initialData?.notes || '');

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!licensePlate.trim()) {
      alert('Vui lòng nhập biển số xe');
      return;
    }

    if (!productId || productId <= 0) {
      alert('Vui lòng chọn sản phẩm');
      return;
    }

    if (quantity <= 0) {
      alert('Vui lòng nhập số lượng hợp lệ');
      return;
    }

    onSubmit({
      docDate,
      supplierName,
      invoiceNumber,
      licensePlate,
      driverName,
      productId,
      quantity,
      notes,
      compartments: [{
        compartmentNumber: 1,
        productId,
        compartmentHeight: 0,
        truckTemperature: 0,
        truckVolume: quantity,
        warehouseHeight: 0,
        actualTemperature: 0,
        receivedVolume: quantity,
      }],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border-2 border-blue-300 rounded-lg p-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Biên Bản Giao Nhận Xăng Dầu</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nhập *</label>
            <input
              type="date"
              required
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Tên nhà cung cấp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số hóa đơn</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Số hóa đơn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biển số xe *</label>
            <input
              type="text"
              required
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="VD: 29K-02756"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tài xế</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Tên tài xế"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm *</label>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">-- Chọn sản phẩm --</option>
              {products?.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập số lượng"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Diễn giải</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={(e) => e.target.select()}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="Ghi chú thêm (nếu có)..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700"
        >
          Lưu phiếu nhập
        </button>
      </div>
    </form>
  );
};

export default TruckInventoryImportForm;
