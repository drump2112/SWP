import { Injectable } from '@nestjs/common';

/**
 * Service tính toán hao hụt và giãn nở xăng dầu
 */
@Injectable()
export class PetroleumCalculationService {
  // Hệ số giãn nở xăng dầu bình quân (β)
  private readonly EXPANSION_COEFFICIENTS = {
    GASOLINE: 0.0013, // Xăng các loại
    DIESEL: 0.0009,   // Dầu Diesel
    KEROSENE: 0.001,  // Dầu hỏa
  };

  // Hệ số hao hụt vận chuyển xăng dầu bình quân (α)
  private readonly LOSS_COEFFICIENTS = {
    GASOLINE: 0.00075, // Xăng các loại
    DIESEL: 0.0003,    // Dầu Diesel
  };

  // Nhiệt độ chuẩn
  private readonly STANDARD_TEMPERATURE = 15; // °C

  /**
   * Lấy hệ số giãn nở theo loại sản phẩm
   * @param productCode Mã sản phẩm (XD95, DO, KEROSENE, etc.)
   * @returns Hệ số giãn nở
   */
  getExpansionCoefficient(productCode: string): number {
    const code = productCode.toUpperCase();

    // Xăng các loại (XD95, XD92, E5RON92, etc.)
    if (code.includes('XD') || code.includes('RON') || code.includes('E5')) {
      return this.EXPANSION_COEFFICIENTS.GASOLINE;
    }

    // Dầu Diesel
    if (code.includes('DO') || code.includes('DIESEL')) {
      return this.EXPANSION_COEFFICIENTS.DIESEL;
    }

    // Dầu hỏa
    if (code.includes('KEROSENE') || code.includes('DHO')) {
      return this.EXPANSION_COEFFICIENTS.KEROSENE;
    }

    // Mặc định dùng hệ số xăng
    return this.EXPANSION_COEFFICIENTS.GASOLINE;
  }

  /**
   * Lấy hệ số hao hụt vận chuyển theo loại sản phẩm
   * @param productCode Mã sản phẩm
   * @returns Hệ số hao hụt
   */
  getLossCoefficient(productCode: string): number {
    const code = productCode.toUpperCase();

    // Xăng các loại
    if (code.includes('XD') || code.includes('RON') || code.includes('E5')) {
      return this.LOSS_COEFFICIENTS.GASOLINE;
    }

    // Dầu Diesel
    if (code.includes('DO') || code.includes('DIESEL')) {
      return this.LOSS_COEFFICIENTS.DIESEL;
    }

    // Mặc định dùng hệ số xăng
    return this.LOSS_COEFFICIENTS.GASOLINE;
  }

  /**
   * Tính thể tích tại nhiệt độ chuẩn (15°C)
   * Công thức: V15 = Vt / [1 + β × (t - 15)]
   *
   * @param volumeAtTemp Thể tích tại nhiệt độ t (lít)
   * @param temperature Nhiệt độ t (°C)
   * @param expansionCoefficient Hệ số giãn nở β
   * @returns Thể tích tại 15°C
   */
  convertToStandardTemperature(
    volumeAtTemp: number,
    temperature: number,
    expansionCoefficient: number,
  ): number {
    const tempDiff = temperature - this.STANDARD_TEMPERATURE;
    const denominator = 1 + expansionCoefficient * tempDiff;
    return volumeAtTemp / denominator;
  }

  /**
   * Tính thể tích từ nhiệt độ chuẩn sang nhiệt độ khác
   * Công thức: Vt = V15 × [1 + β × (t - 15)]
   *
   * @param volumeAt15 Thể tích tại 15°C (lít)
   * @param temperature Nhiệt độ đích t (°C)
   * @param expansionCoefficient Hệ số giãn nở β
   * @returns Thể tích tại nhiệt độ t
   */
  convertFromStandardTemperature(
    volumeAt15: number,
    temperature: number,
    expansionCoefficient: number,
  ): number {
    const tempDiff = temperature - this.STANDARD_TEMPERATURE;
    return volumeAt15 * (1 + expansionCoefficient * tempDiff);
  }

  /**
   * Tính lượng hao hụt cho phép
   * Công thức: Hao hụt cho phép = Thể tích × Hệ số hao hụt
   *
   * @param volume Thể tích (lít)
   * @param lossCoefficient Hệ số hao hụt α
   * @returns Hao hụt cho phép (lít)
   */
  calculateAllowedLoss(volume: number, lossCoefficient: number): number {
    return volume * lossCoefficient;
  }

  /**
   * Tính lượng thừa/thiếu
   * Công thức: Thừa/Thiếu = (Thực nhận - Hao hụt thực tế) - Hao hụt cho phép
   *
   * @param receivedVolume Lượng thực nhận (lít)
   * @param actualLoss Hao hụt thực tế (lít)
   * @param allowedLoss Hao hụt cho phép (lít)
   * @returns Lượng thừa/thiếu (lít) - Dương: thừa, Âm: thiếu
   */
  calculateExcessShortage(
    receivedVolume: number,
    actualLoss: number,
    allowedLoss: number,
  ): number {
    return receivedVolume - actualLoss - allowedLoss;
  }

  /**
   * Tính toán tổng hợp cho một ngăn xe téc
   */
  calculateCompartment(data: {
    truckVolume: number;          // Thể tích tại xe téc
    truckTemperature: number;     // Nhiệt độ tại xe téc
    actualTemperature: number;    // Nhiệt độ thực tế
    productCode: string;          // Mã sản phẩm
  }) {
    const { truckVolume, truckTemperature, actualTemperature, productCode } = data;

    const expansionCoeff = this.getExpansionCoefficient(productCode);
    const lossCoeff = this.getLossCoefficient(productCode);

    // Bước 1: Quy đổi từ nhiệt độ xe téc về 15°C
    const volumeAt15 = this.convertToStandardTemperature(
      truckVolume,
      truckTemperature,
      expansionCoeff,
    );

    // Bước 2: Quy đổi từ 15°C sang nhiệt độ thực tế
    const actualVolume = this.convertFromStandardTemperature(
      volumeAt15,
      actualTemperature,
      expansionCoeff,
    );

    // Bước 3: Tính hao hụt cho phép
    const allowedLoss = this.calculateAllowedLoss(truckVolume, lossCoeff);

    return {
      volumeAt15,
      actualVolume,
      allowedLoss,
      expansionCoeff,
      lossCoeff,
    };
  }

  /**
   * Tính toán tổng hợp cho toàn bộ phiếu nhập
   */
  calculateDocument(compartments: Array<{
    truckVolume: number;
    actualVolume: number;
    receivedVolume: number;
    productCode: string;
  }>) {
    let totalTruckVolume = 0;
    let totalActualVolume = 0;
    let totalReceivedVolume = 0;
    let totalAllowedLoss = 0;

    // Lấy hệ số từ ngăn đầu tiên (giả định tất cả các ngăn cùng loại sản phẩm)
    const firstCompartment = compartments[0];
    const expansionCoeff = this.getExpansionCoefficient(firstCompartment.productCode);
    const lossCoeff = this.getLossCoefficient(firstCompartment.productCode);

    compartments.forEach((comp) => {
      totalTruckVolume += comp.truckVolume;
      totalActualVolume += comp.actualVolume;
      totalReceivedVolume += comp.receivedVolume;

      const allowedLoss = this.calculateAllowedLoss(comp.truckVolume, lossCoeff);
      totalAllowedLoss += allowedLoss;
    });

    // Tính hao hụt thực tế
    const totalActualLoss = totalTruckVolume - totalReceivedVolume;

    // Tính thừa/thiếu
    const excessShortage = totalReceivedVolume - totalActualLoss - totalAllowedLoss;

    // Tính lượng điều chỉnh do nhiệt độ
    const temperatureAdjustment = totalActualVolume - totalTruckVolume;

    return {
      expansionCoeff,
      lossCoeff,
      totalTruckVolume,
      totalActualVolume,
      totalReceivedVolume,
      totalLossVolume: totalActualLoss,
      allowedLossVolume: totalAllowedLoss,
      excessShortageVolume: excessShortage,
      temperatureAdjustmentVolume: temperatureAdjustment,
      status: excessShortage > 0 ? 'EXCESS' : excessShortage < 0 ? 'SHORTAGE' : 'NORMAL',
    };
  }
}
