import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Khởi tạo Storage với credentials từ env variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      : undefined;

    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: credentials, // Dùng JSON object thay vì file path
    });
    this.bucketName = process.env.GCS_BUCKET_NAME;
  }

  /**
   * Upload file lên Google Cloud Storage
   * @param file - File buffer từ multer
   * @param fileName - Tên file muốn lưu
   * @param folder - Folder trong bucket (postman/k6)
   * @returns Promise<string> - Public URL của file
   */
  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folder: string,
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const fileUpload = bucket.file(`${folder}/${fileName}`);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        reject(error);
      });

      stream.on('finish', () => {
        // Tạo public URL
        const publicUrl = `gs://${this.bucketName}/${folder}/${fileName}`;
        resolve(publicUrl);
      });

      stream.end(file.buffer);
    });
  }

  /**
   * Đọc nội dung file từ GCS
   * @param filePath - Đường dẫn file trong GCS (gs://bucket/folder/file)
   * @returns Promise<string> - Nội dung file
   */
  async readFile(filePath: string): Promise<string> {
    // Parse GCS path: gs://bucket/folder/file
    const pathParts = filePath.replace('gs://', '').split('/');
    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join('/');

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const [contents] = await file.download();
    return contents.toString('utf8');
  }

  /**
   * Xóa file từ GCS
   * @param filePath - Đường dẫn file trong GCS
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!filePath || !filePath.startsWith('gs://')) {
      return; // Skip nếu không phải GCS path
    }

    const pathParts = filePath.replace('gs://', '').split('/');
    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join('/');

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(fileName);

    try {
      await file.delete();
    } catch (error) {
      console.warn('Không thể xóa file từ GCS:', filePath, error.message);
    }
  }

  /**
   * Kiểm tra file có tồn tại không
   * @param filePath - Đường dẫn file trong GCS
   */
  async fileExists(filePath: string): Promise<boolean> {
    if (!filePath || !filePath.startsWith('gs://')) {
      return false;
    }

    const pathParts = filePath.replace('gs://', '').split('/');
    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join('/');

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(fileName);

    try {
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
    }
    
    async downloadFile(filePath: string): Promise<Buffer> {
  // Parse GCS path
  const pathParts = filePath.replace('gs://', '').split('/');
  const bucketName = pathParts[0];
  const fileName = pathParts.slice(1).join('/');

  const bucket = this.storage.bucket(bucketName);
  const file = bucket.file(fileName);

  const [contents] = await file.download();
  return contents; // trả về Buffer
    }
    
    
async uploadBuffer(
  buffer: Buffer,
  fileName: string,
  folder: string,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  const bucket = this.storage.bucket(this.bucketName);
  const fileUpload = bucket.file(`${folder}/${fileName}`);

  const stream = fileUpload.createWriteStream({
    metadata: { contentType },
  });

  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', () => {
      resolve(`gs://${this.bucketName}/${folder}/${fileName}`);
    });
    stream.end(buffer);
  });
    }
    
    // Thêm vào GcsService
async getSignedUrl(
  filePath: string, 
  action: 'read' | 'write' = 'read', 
  expires: number = 3600 // seconds
): Promise<string> {
  const pathParts = filePath.replace('gs://', '').split('/');
  const bucketName = pathParts[0];
  const fileName = pathParts.slice(1).join('/');

  const bucket = this.storage.bucket(bucketName);
  const file = bucket.file(fileName);

  const [signedUrl] = await file.getSignedUrl({
    action: action,
    expires: Date.now() + expires * 1000,
  });

  return signedUrl;
}

async listFiles(prefix: string = ''): Promise<any[]> {
  const bucket = this.storage.bucket(this.bucketName);
  const [files] = await bucket.getFiles({ prefix });
  return files;
}

}