import { Router } from 'express';
import multer from 'multer';
import {
  createAssignment,
  listAssignments,
  getAssignment,
  getByJobId,
  regenerate,
  deleteAssignment,
  downloadPdf,
} from '../controllers/assignment.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'application/pdf' ||
      file.mimetype.startsWith('text/') ||
      file.mimetype.startsWith('image/');
    if (!ok) return cb(new Error('Unsupported file type'));
    cb(null, true);
  },
});

const router = Router();

router.get('/', listAssignments);
router.post('/', upload.single('file'), createAssignment);
router.get('/:id', getAssignment);
router.delete('/:id', deleteAssignment);
router.post('/:id/regenerate', regenerate);
router.get('/:id/pdf', downloadPdf);
router.get('/job/:jobId', getByJobId);

export default router;
