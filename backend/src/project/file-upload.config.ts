import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    const dest = file.originalname.endsWith('.json')
      ? './uploads/postman'
      : './uploads/k6';

    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

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
