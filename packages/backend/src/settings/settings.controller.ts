import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { SettingsService } from './settings.service';
import { FileUploadService } from './services/file-upload.service';
import { BranchesService } from './services/branches.service';
import { TenantResolverGuard } from '../tenant/tenant-resolver.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSettingsDto as UpdateSettingsDtoClass } from './dto/update-settings.dto';
import { CreateBranchDto as CreateBranchDtoClass } from './dto/create-branch.dto';
import { UpdateBranchDto as UpdateBranchDtoClass } from './dto/update-branch.dto';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Controller('settings')
@UseGuards(TenantResolverGuard, JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly fileUploadService: FileUploadService,
    private readonly branchesService: BranchesService,
  ) {}

  /**
   * Get current club settings
   */
  @Get()
  async getSettings(@Req() req: Request) {
    const tenantContext = req.tenantContext!;
    return await this.settingsService.getSettings(tenantContext);
  }

  /**
   * Update club settings
   */
  @Patch()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateSettings(
    @Body() dto: UpdateSettingsDtoClass,
    @Req() req: Request,
  ) {
    const tenantContext = req.tenantContext!;
    return await this.settingsService.updateSettings(tenantContext, dto);
  }

  /**
   * Upload logo image
   */
  @Post('upload/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @UploadedFile() file: MulterFile | undefined,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }

    const filePath = await this.fileUploadService.uploadImage(
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
      },
      'logos',
    );

    // Update settings with new logo URL
    const tenantContext = req.tenantContext!;
    await this.settingsService.updateSettings(tenantContext, {
      brandingLogoUrl: filePath,
    });

    return { url: filePath };
  }

  /**
   * Upload cover image
   */
  @Post('upload/cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @UploadedFile() file: MulterFile | undefined,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }

    const filePath = await this.fileUploadService.uploadImage(
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
      },
      'covers',
    );

    // Update settings with new cover URL
    const tenantContext = req.tenantContext!;
    await this.settingsService.updateSettings(tenantContext, {
      brandingCoverUrl: filePath,
    });

    return { url: filePath };
  }

  /**
   * Get all branches
   */
  @Get('branches')
  async getBranches(@Req() req: Request) {
    const tenantContext = req.tenantContext!;
    return await this.branchesService.getBranches(tenantContext);
  }

  /**
   * Get a single branch
   */
  @Get('branches/:id')
  async getBranch(@Param('id') id: string, @Req() req: Request) {
    const tenantContext = req.tenantContext!;
    return await this.branchesService.getBranchById(tenantContext, id);
  }

  /**
   * Create a new branch
   */
  @Post('branches')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createBranch(@Body() dto: CreateBranchDtoClass, @Req() req: Request) {
    const tenantContext = req.tenantContext!;
    return await this.branchesService.createBranch(tenantContext, dto);
  }

  /**
   * Update a branch
   */
  @Put('branches/:id')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateBranch(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDtoClass,
    @Req() req: Request,
  ) {
    const tenantContext = req.tenantContext!;
    return await this.branchesService.updateBranch(tenantContext, {
      ...dto,
      id,
    });
  }

  /**
   * Delete a branch
   */
  @Delete('branches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBranch(@Param('id') id: string, @Req() req: Request) {
    const tenantContext = req.tenantContext!;
    await this.branchesService.deleteBranch(tenantContext, id);
  }
}
