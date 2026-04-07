import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { writeFile, mkdir, unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import multer from "multer";
import { sendSuccess, sendCreated, sendError, sendNotFound, sendValidationError } from "../lib/response.js";
import { customerAuth, riderAuth, requireRole } from "../middleware/security.js";

const execFileAsync = promisify(execFile);
const MAX_VIDEO_DURATION_SECS = 60;

const router: IRouter = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const prescriptionRefMap = new Map<string, string>();

async function ensureDir() {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

/* ── Multer instance for multipart/form-data (memory storage) ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only MP4, MOV, and WebM videos are allowed"));
    }
  },
});

/* ── Helper: save a buffer and return the public URL ── */
async function saveBuffer(buffer: Buffer, prefix: string, mimeType: string): Promise<string> {
  const ext = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
  const uniqueName = `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}${ext}`;
  await ensureDir();
  await writeFile(path.join(UPLOADS_DIR, uniqueName), buffer);
  return `/api/uploads/${uniqueName}`;
}

async function saveVideoBuffer(buffer: Buffer, prefix: string, mimeType: string): Promise<string> {
  const ext = mimeType === "video/quicktime" ? ".mov" : mimeType === "video/webm" ? ".webm" : ".mp4";
  const uniqueName = `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}${ext}`;
  await ensureDir();
  await writeFile(path.join(UPLOADS_DIR, uniqueName), buffer);
  return `/api/uploads/${uniqueName}`;
}

/* ── POST /uploads — JSON base64 upload (customers / super-app) ── */
router.post("/", customerAuth, async (req, res) => {
  try {
    const { file, filename, mimeType } = req.body;

    if (!file) {
      sendValidationError(res, "No file data provided");
      return;
    }

    const mime = mimeType || "image/jpeg";
    if (!ALLOWED_TYPES.includes(mime)) {
      sendValidationError(res, "Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    const base64Data = file.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE) {
      sendValidationError(res, "File too large. Maximum 5MB allowed");
      return;
    }

    const url = await saveBuffer(buffer, "upload", mime);

    sendCreated(res, {
      url,
      filename: filename || path.basename(url),
      size: buffer.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    sendError(res, msg);
  }
});

/* ── POST /uploads/proof — multipart/form-data delivery-proof upload (riders) ──
   Uses riderAuth so rider JWTs are accepted.
   File field name: "file"; optional field "purpose" for auditing.
   Enforces same 5MB / allowed-type limits as the JSON route.
*/
router.post(
  "/proof",
  riderAuth,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          sendValidationError(res, "File too large. Maximum 5MB allowed");
          return;
        }
        sendValidationError(res, err.message);
        return;
      }
      if (err) {
        sendValidationError(res, err instanceof Error ? err.message : "Upload failed");
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        sendValidationError(res, "No file uploaded");
        return;
      }

      const { mimetype, buffer, originalname } = req.file;

      if (!ALLOWED_TYPES.includes(mimetype)) {
        sendValidationError(res, "Only JPEG, PNG, and WebP images are allowed");
        return;
      }

      const url = await saveBuffer(buffer, "proof", mimetype);

      sendCreated(res, {
        url,
        filename: originalname || path.basename(url),
        size: buffer.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      sendError(res, msg);
    }
  },
);

/* ── POST /uploads/register — multipart/form-data upload for registration documents (unauthenticated) ──
   Used during rider/vendor registration before the user has a JWT.
   Same 5MB / allowed-type limits as other upload routes.
*/
router.post(
  "/register",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          sendValidationError(res, "File too large. Maximum 5MB allowed");
          return;
        }
        sendValidationError(res, err.message);
        return;
      }
      if (err) {
        sendValidationError(res, err instanceof Error ? err.message : "Upload failed");
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        sendValidationError(res, "No file uploaded");
        return;
      }

      const { mimetype, buffer, originalname } = req.file;

      if (!ALLOWED_TYPES.includes(mimetype)) {
        sendValidationError(res, "Only JPEG, PNG, and WebP images are allowed");
        return;
      }

      const url = await saveBuffer(buffer, "reg", mimetype);

      sendCreated(res, {
        url,
        filename: originalname || path.basename(url),
        size: buffer.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      sendError(res, msg);
    }
  },
);

/* ── POST /uploads/prescription — base64 prescription upload (customers) ── */
router.post("/prescription", customerAuth, async (req, res) => {
  try {
    const { file, mimeType, refId } = req.body;

    if (!file) {
      sendValidationError(res, "No file data provided");
      return;
    }

    if (!refId || typeof refId !== "string") {
      sendValidationError(res, "refId is required");
      return;
    }

    const mime = mimeType || "image/jpeg";
    if (!ALLOWED_TYPES.includes(mime)) {
      sendValidationError(res, "Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    const base64Data = file.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE) {
      sendValidationError(res, "File too large. Maximum 5MB allowed");
      return;
    }

    const url = await saveBuffer(buffer, "rx", mime);
    prescriptionRefMap.set(refId, url);

    setTimeout(() => prescriptionRefMap.delete(refId), 60 * 60 * 1000);

    sendCreated(res, { url, refId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    sendError(res, msg);
  }
});

router.get("/prescription/resolve/:refId", (req, res) => {
  const url = prescriptionRefMap.get(req.params.refId!);
  if (url) {
    sendSuccess(res, { url });
  } else {
    sendNotFound(res, "Reference not found or expired");
  }
});

/* ── POST /uploads/video — multipart video upload (vendors only) ── */
router.post(
  "/video",
  requireRole("vendor", { vendorApprovalCheck: true }),
  (req, res, next) => {
    videoUpload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          sendValidationError(res, "Video too large. Maximum 50MB allowed");
          return;
        }
        sendValidationError(res, err.message);
        return;
      }
      if (err) {
        sendValidationError(res, err instanceof Error ? err.message : "Upload failed");
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        sendValidationError(res, "No video file uploaded");
        return;
      }

      const { mimetype, buffer, originalname } = req.file;

      if (!ALLOWED_VIDEO_TYPES.includes(mimetype)) {
        sendValidationError(res, "Only MP4, MOV, and WebM videos are allowed");
        return;
      }

      const tmpPath = path.join(os.tmpdir(), `upload_${randomUUID()}.tmp`);
      try {
        await writeFile(tmpPath, buffer);
        const { stdout } = await execFileAsync("ffprobe", [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1",
          tmpPath,
        ]);
        const duration = parseFloat(stdout.trim());
        if (isNaN(duration)) {
          sendValidationError(res, "Could not determine video duration. Please upload a valid video file.");
          return;
        }
        if (duration > MAX_VIDEO_DURATION_SECS) {
          sendValidationError(res, `Video must be ${MAX_VIDEO_DURATION_SECS} seconds or less. Your video is ${Math.ceil(duration)}s.`);
          return;
        }
      } catch {
        sendValidationError(res, "Could not verify video duration. Please try a different file or format.");
        return;
      } finally {
        unlink(tmpPath).catch(() => {});
      }

      const url = await saveVideoBuffer(buffer, "video", mimetype);

      sendCreated(res, {
        url,
        filename: originalname || path.basename(url),
        size: buffer.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      sendError(res, msg);
    }
  },
);

export { prescriptionRefMap };

export default router;
