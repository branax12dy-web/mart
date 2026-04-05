import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import multer from "multer";
import { sendSuccess, sendCreated, sendError, sendNotFound, sendValidationError } from "../lib/response.js";
import { customerAuth, riderAuth } from "../middleware/security.js";

const router: IRouter = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

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

/* ── Helper: save a buffer and return the public URL ── */
async function saveBuffer(buffer: Buffer, prefix: string, mimeType: string): Promise<string> {
  const ext = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
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

export { prescriptionRefMap };

export default router;
