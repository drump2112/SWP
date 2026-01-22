import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, IsNull, Or, In } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { SetRegionPricesDto } from './dto/set-region-prices.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductPrice)
    private productPriceRepository: Repository<ProductPrice>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async findAll() {
    return this.productRepository.find();
  }

  async findOne(id: number) {
    return this.productRepository.findOne({ where: { id } });
  }

  async update(id: number, updateProductDto: CreateProductDto): Promise<Product | null> {
    await this.productRepository.update(id, updateProductDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }

  async createPrice(createPriceDto: CreateProductPriceDto) {
    // Đóng giá cũ (nếu có)
    const oldPrices = await this.productPriceRepository.find({
      where: {
        productId: createPriceDto.productId,
        regionId: createPriceDto.regionId,
        validTo: IsNull(),
      },
    });

    const validFrom = new Date(createPriceDto.validFrom);

    for (const oldPrice of oldPrices) {
      oldPrice.validTo = validFrom;
      await this.productPriceRepository.save(oldPrice);
    }

    // Tạo giá mới
    const price = this.productPriceRepository.create({
      ...createPriceDto,
      validFrom,
      validTo: createPriceDto.validTo ? new Date(createPriceDto.validTo) : undefined,
    });

    return this.productPriceRepository.save(price);
  }

  /**
   * Lấy giá hiện tại hoặc tại thời điểm cụ thể
   * @param productId - ID sản phẩm
   * @param regionId - ID khu vực
   * @param atTime - Thời điểm cần lấy giá (mặc định là now)
   */
  async getCurrentPrice(productId: number, regionId: number, atTime?: Date) {
    const targetTime = atTime || new Date();
    return this.productPriceRepository
      .createQueryBuilder('pp')
      .where('pp.product_id = :productId', { productId })
      .andWhere('pp.region_id = :regionId', { regionId })
      .andWhere('pp.valid_from <= :targetTime', { targetTime })
      .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :targetTime)', { targetTime })
      .getOne();
  }

  /**
   * Lấy giá của nhiều sản phẩm tại thời điểm cụ thể
   * @param productIds - Danh sách ID sản phẩm
   * @param regionId - ID khu vực
   * @param atTime - Thời điểm cần lấy giá
   */
  async getPricesAtTime(productIds: number[], regionId: number, atTime: Date) {
    if (productIds.length === 0) return [];

    return this.productPriceRepository
      .createQueryBuilder('pp')
      .leftJoinAndSelect('pp.product', 'product')
      .where('pp.product_id IN (:...productIds)', { productIds })
      .andWhere('pp.region_id = :regionId', { regionId })
      .andWhere('pp.valid_from <= :atTime', { atTime })
      .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :atTime)', { atTime })
      .orderBy('pp.valid_from', 'DESC')
      .getMany();
  }

  async getPriceHistory(productId: number, regionId: number) {
    return this.productPriceRepository.find({
      where: { productId, regionId },
      order: { validFrom: 'DESC' },
    });
  }

  async getPricesByRegion(regionId: number) {
    return this.productPriceRepository
      .createQueryBuilder('pp')
      .leftJoinAndSelect('pp.product', 'product')
      .leftJoinAndSelect('pp.region', 'region')
      .where('pp.region_id = :regionId', { regionId })
      .orderBy('pp.valid_from', 'DESC')
      .getMany();
  }

  /**
   * Set giá cho nhiều sản phẩm trong một khu vực
   * Giá sẽ tự động áp dụng cho tất cả các cửa hàng trong khu vực đó
   */
  async setRegionPrices(setRegionPricesDto: SetRegionPricesDto) {
    const { regionId, prices, validFrom, validTo } = setRegionPricesDto;
    const validFromDate = new Date(validFrom);
    const validToDate = validTo ? new Date(validTo) : null;

    const results: ProductPrice[] = [];

    for (const priceItem of prices) {
      // Đóng giá cũ (nếu có)
      const oldPrices = await this.productPriceRepository.find({
        where: {
          productId: priceItem.productId,
          regionId: regionId,
          validTo: IsNull(),
        },
      });

      for (const oldPrice of oldPrices) {
        oldPrice.validTo = validFromDate;
        await this.productPriceRepository.save(oldPrice);
      }

      // Tạo giá mới
      const newPrice = this.productPriceRepository.create({
        productId: priceItem.productId,
        regionId: regionId,
        price: priceItem.price,
        validFrom: validFromDate,
        ...(validToDate && { validTo: validToDate }),
      });

      const savedPrice = await this.productPriceRepository.save(newPrice);
      results.push(savedPrice);
    }

    return {
      message: `Đã áp dụng giá cho ${results.length} sản phẩm trong khu vực`,
      prices: results,
    };
  }

  /**
   * Lấy tất cả giá hiện tại của một sản phẩm cho tất cả các khu vực
   */
  async getProductPricesAllRegions(productId: number) {
    const now = new Date();
    return this.productPriceRepository
      .createQueryBuilder('pp')
      .leftJoinAndSelect('pp.region', 'region')
      .where('pp.product_id = :productId', { productId })
      .andWhere('pp.valid_from <= :now', { now })
      .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :now)', { now })
      .getMany();
  }

  /**
   * Lấy giá hiện tại của một sản phẩm cho một cửa hàng cụ thể
   * Giá sẽ được lấy dựa trên khu vực của cửa hàng
   */
  async getProductPriceByStore(productId: number, storeId: number) {
    const now = new Date();
    return this.productPriceRepository
      .createQueryBuilder('pp')
      .leftJoinAndSelect('pp.region', 'region')
      .leftJoin('region.stores', 'store')
      .where('pp.product_id = :productId', { productId })
      .andWhere('store.id = :storeId', { storeId })
      .andWhere('pp.valid_from <= :now', { now })
      .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :now)', { now })
      .getOne();
  }

  /**
   * Lấy tất cả giá hiện tại cho một cửa hàng (dựa trên khu vực)
   */
  async getAllPricesByStore(storeId: number) {
    const now = new Date();
    return this.productPriceRepository
      .createQueryBuilder('pp')
      .leftJoinAndSelect('pp.product', 'product')
      .leftJoinAndSelect('pp.region', 'region')
      .leftJoin('region.stores', 'store')
      .where('store.id = :storeId', { storeId })
      .andWhere('pp.valid_from <= :now', { now })
      .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :now)', { now })
      .getMany();
  }

  /**
   * Update một giá cụ thể
   */
  async updatePrice(priceId: number, updatePriceDto: UpdateProductPriceDto) {
    const price = await this.productPriceRepository.findOne({
      where: { id: priceId },
    });

    if (!price) {
      throw new Error('Không tìm thấy giá');
    }

    if (updatePriceDto.price !== undefined) {
      price.price = updatePriceDto.price;
    }
    if (updatePriceDto.validFrom) {
      price.validFrom = new Date(updatePriceDto.validFrom);
    }
    if (updatePriceDto.validTo) {
      price.validTo = new Date(updatePriceDto.validTo);
    }

    return this.productPriceRepository.save(price);
  }

  /**
   * Xóa một giá
   */
  async deletePrice(priceId: number) {
    const result = await this.productPriceRepository.delete(priceId);
    if (result.affected === 0) {
      throw new Error('Không tìm thấy giá');
    }
    return { message: 'Đã xóa giá thành công' };
  }

  /**
   * Lấy tất cả kỳ giá (dùng cho dropdown filter trong báo cáo)
   * Trả về tất cả các kỳ giá đã từng được tạo, sắp xếp theo validFrom mới nhất
   */
  async getAllPrices() {
    return this.productPriceRepository
      .createQueryBuilder('pp')
      .leftJoinAndSelect('pp.product', 'product')
      .leftJoinAndSelect('pp.region', 'region')
      .orderBy('pp.valid_from', 'DESC')
      .getMany();
  }
}
