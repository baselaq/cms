import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(private readonly configService: ConfigService) {
    // Get upload directory from config or use default
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') ||
      join(process.cwd(), 'uploads');
    this.maxFileSize =
      parseInt(this.configService.get<string>('MAX_FILE_SIZE') || '5242880', 10) || 5242880; // 5MB default
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    // Ensure upload directory exists
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      if (!existsSync(this.uploadDir)) {
        await mkdir(this.uploadDir, { recursive: true });
        this.logger.log(`Created upload directory: ${this.uploadDir}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error}`);
    }
  }

  /**
   * Upload an image file
   * @param file - The file buffer and metadata
   * @param subdirectory - Optional subdirectory (e.g., 'logos', 'covers')
   * @returns The public URL path to the uploaded file
   */
  async uploadImage(
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    },
    subdirectory: 'logos' | 'covers' = 'logos',
  ): Promise<string> {
    // Validate file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file size
    if (file.buffer.length > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = this.getFileExtension(file.originalname);
      const filename = `${timestamp}-${randomString}${extension}`;

      // Create subdirectory path
      const subdirPath = join(this.uploadDir, subdirectory);
      if (!existsSync(subdirPath)) {
        await mkdir(subdirPath, { recursive: true });
      }

      // Write file
      const filePath = join(subdirPath, filename);
      await writeFile(filePath, file.buffer);

      this.logger.log(`File uploaded: ${filePath}`);

      // Return public URL path (relative to uploads directory)
      // In production, this would be a full URL to your CDN or storage service
      return `/uploads/${subdirectory}/${filename}`;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error}`);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Delete an uploaded file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { unlink } = await import('fs/promises');
      const fullPath = join(this.uploadDir, filePath.replace('/uploads/', ''));
      if (existsSync(fullPath)) {
        await unlink(fullPath);
        this.logger.log(`File deleted: ${fullPath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${error}`);
      // Don't throw error - file might already be deleted
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot).toLowerCase();
  }
}

