import { Controller, Get, Post, Body, Param, UseGuards, Put, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { SetRegionPricesDto } from './dto/set-region-prices.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // === Static routes first (before dynamic params) ===

  @Post()
  @Roles('SALES', 'ADMIN')
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  /**
   * Set giá cho nhiều sản phẩm trong một khu vực
   * POST /products/region-prices
   * Body: { regionId, prices: [{ productId, price }], validFrom, validTo? }
   */
  @Post('region-prices')
  @Roles('SALES', 'ADMIN')
  setRegionPrices(@Body() setRegionPricesDto: SetRegionPricesDto) {
    return this.productsService.setRegionPrices(setRegionPricesDto);
  }

  @Post('prices')
  @Roles('SALES', 'ADMIN')
  createPrice(@Body() createPriceDto: CreateProductPriceDto) {
    return this.productsService.createPrice(createPriceDto);
  }

  @Get('region/:regionId/prices')
  getPricesByRegion(@Param('regionId') regionId: string) {
    return this.productsService.getPricesByRegion(+regionId);
  }

  @Get('store/:storeId/all-prices')
  getAllPricesByStore(@Param('storeId') storeId: string) {
    return this.productsService.getAllPricesByStore(+storeId);
  }

  // === Dynamic param routes ===

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Put(':id')
  @Roles('SALES', 'ADMIN')
  update(@Param('id') id: string, @Body() updateProductDto: CreateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }

  @Get(':productId/price/:regionId')
  getCurrentPrice(
    @Param('productId') productId: string,
    @Param('regionId') regionId: string,
  ) {
    return this.productsService.getCurrentPrice(+productId, +regionId);
  }

  @Get(':productId/price-history/:regionId')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getPriceHistory(
    @Param('productId') productId: string,
    @Param('regionId') regionId: string,
  ) {
    return this.productsService.getPriceHistory(+productId, +regionId);
  }

  /**
   * Lấy tất cả giá hiện tại của một sản phẩm cho tất cả khu vực
   * GET /products/:productId/prices-all-regions
   */
  @Get(':productId/prices-all-regions')
  getProductPricesAllRegions(@Param('productId') productId: string) {
    return this.productsService.getProductPricesAllRegions(+productId);
  }

  /**
   * Lấy giá hiện tại của một sản phẩm cho một cửa hàng cụ thể
   * GET /products/:productId/price-by-store/:storeId
   */
  @Get(':productId/price-by-store/:storeId')
  getProductPriceByStore(
    @Param('productId') productId: string,
    @Param('storeId') storeId: string,
  ) {
    return this.productsService.getProductPriceByStore(+productId, +storeId);
  }

  /**
   * Update một giá cụ thể
   * PUT /products/prices/:priceId
   */
  @Put('prices/:priceId')
  @Roles('SALES', 'ADMIN')
  updatePrice(
    @Param('priceId') priceId: string,
    @Body() updatePriceDto: UpdateProductPriceDto,
  ) {
    return this.productsService.updatePrice(+priceId, updatePriceDto);
  }

  /**
   * Xóa một giá
   * DELETE /products/prices/:priceId
   */
  @Delete('prices/:priceId')
  @Roles('ADMIN')
  deletePrice(@Param('priceId') priceId: string) {
    return this.productsService.deletePrice(+priceId);
  }
}
