import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';

// Sử dụng memory storage thay vì disk storage cho cloud deployment
export const multerStorage = memoryStorage();

export const fileFilter = (req, file, cb) => {
  if (
    file.originalname.endsWith('.json') ||
    file.originalname.endsWith('.js')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only .json and .js files are allowed'), false);
  }
};