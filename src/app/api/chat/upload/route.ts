/**
 * Chat upload API route.
 *
 * Uploads files, validates supported attachment types,
 * extracts searchable text where supported, and creates attachment messages.
 */

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { saveAttachmentMessage } from "@/server/attachment.service";
import { findRoomUserById } from "@/server/room.service";
import { getChatSessionFromRequest } from "@/server/security/session";

export const runtime = "nodejs";

const UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "uploads");

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_LENGTH = 100_000;

type SupportedAttachmentType =
  | "txt"
  | "pdf"
  | "docx"
  | "xlsx"
  | "xls"
  | "png"
  | "jpg"
  | "jpeg"
  | "gif"
  | "webp";

const ATTACHMENT_MIME_TYPES: Record<SupportedAttachmentType, string> = {
  txt: "text/plain",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName).trim();

  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

function getFileExtension(fileName: string) {
  return path.extname(fileName).toLowerCase().replace(".", "");
}

function isZipBasedOfficeFile(buffer: Buffer) {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

function isLegacyExcelFile(buffer: Buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  );
}

function isPdfFile(buffer: Buffer) {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString() === "%PDF";
}

function isPlainTextFile(buffer: Buffer) {
  return !buffer.includes(0x00);
}

function isPngFile(buffer: Buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isJpegFile(buffer: Buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function isGifFile(buffer: Buffer) {
  if (buffer.length < 6) {
    return false;
  }

  const header = buffer.subarray(0, 6).toString("ascii");

  return header === "GIF87a" || header === "GIF89a";
}

function isWebpFile(buffer: Buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function resolveSupportedAttachmentType(
  file: File,
  buffer: Buffer
): SupportedAttachmentType | null {
  const extension = getFileExtension(file.name);

  if (extension === "txt" && isPlainTextFile(buffer)) {
    return "txt";
  }

  if (extension === "pdf" && isPdfFile(buffer)) {
    return "pdf";
  }

  if (extension === "docx" && isZipBasedOfficeFile(buffer)) {
    return "docx";
  }

  if (extension === "xlsx" && isZipBasedOfficeFile(buffer)) {
    return "xlsx";
  }

  if (extension === "xls" && isLegacyExcelFile(buffer)) {
    return "xls";
  }

  if (extension === "png" && isPngFile(buffer)) {
    return "png";
  }

  if ((extension === "jpg" || extension === "jpeg") && isJpegFile(buffer)) {
    return extension;
  }

  if (extension === "gif" && isGifFile(buffer)) {
    return "gif";
  }

  if (extension === "webp" && isWebpFile(buffer)) {
    return "webp";
  }

  return null;
}

function limitExtractedText(text: string | null) {
  if (!text) {
    return null;
  }

  return text.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

async function extractPdfText(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();

    return limitExtractedText(result.text);
  } finally {
    await parser.destroy();
  }
}

async function extractAttachmentText(
  buffer: Buffer,
  attachmentType: SupportedAttachmentType
) {
  if (attachmentType === "txt") {
    return limitExtractedText(buffer.toString("utf8"));
  }

  if (attachmentType === "pdf") {
    return extractPdfText(buffer);
  }

  if (attachmentType === "docx") {
    const result = await mammoth.extractRawText({
      buffer,
    });

    return limitExtractedText(result.value);
  }

  if (attachmentType === "xlsx" || attachmentType === "xls") {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
    });

    const text = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      return XLSX.utils.sheet_to_csv(sheet);
    }).join("\n");

    return limitExtractedText(text);
  }

  return null;
}

function createStoredFilePath(storedFileName: string) {
  const storedFilePath = path.join(UPLOAD_DIRECTORY, storedFileName);
  const normalizedUploadDirectory = path.resolve(UPLOAD_DIRECTORY);
  const normalizedStoredFilePath = path.resolve(storedFilePath);

  if (!normalizedStoredFilePath.startsWith(normalizedUploadDirectory + path.sep)) {
    throw new Error("Invalid upload path.");
  }

  return normalizedStoredFilePath;
}

async function handleUpload(request: NextRequest) {
  const session = getChatSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        error: "Your session is no longer valid.",
      },
      {
        status: 401,
      }
    );
  }

  const user = await findRoomUserById(session.roomId, session.userId);

  if (!user) {
    return NextResponse.json(
      {
        error: "User does not belong to this room.",
      },
      {
        status: 403,
      }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid upload request.",
      },
      {
        status: 400,
      }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: "File is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      {
        error: "File is empty.",
      },
      {
        status: 400,
      }
    );
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: "File size must be 10 MB or less.",
      },
      {
        status: 413,
      }
    );
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const attachmentType = resolveSupportedAttachmentType(file, fileBuffer);

  if (!attachmentType) {
    return NextResponse.json(
      {
        error: "Unsupported or invalid file type.",
      },
      {
        status: 415,
      }
    );
  }

  await mkdir(UPLOAD_DIRECTORY, {
    recursive: true,
    mode: 0o750,
  });

  const safeFileName = sanitizeFileName(file.name);

  if (!safeFileName) {
    return NextResponse.json(
      {
        error: "Invalid file name.",
      },
      {
        status: 400,
      }
    );
  }

  const storedFileName = `${nanoid()}-${safeFileName}`;
  const storedFilePath = createStoredFilePath(storedFileName);

  await writeFile(storedFilePath, fileBuffer, {
    flag: "wx",
    mode: 0o640,
  });

  let attachmentText: string | null = null;

  try {
    attachmentText = await extractAttachmentText(fileBuffer, attachmentType);
  } catch (error) {
    console.error("Attachment text extraction failed", error);
  }

  try {
    await saveAttachmentMessage({
      roomId: session.roomId,
      userId: session.userId,
      fileName: safeFileName,
      fileUrl: `/uploads/${storedFileName}`,
      fileType: ATTACHMENT_MIME_TYPES[attachmentType],
      fileSize: file.size,
      attachmentText,
    });
  } catch (error) {
    await unlink(storedFilePath).catch(() => undefined);

    console.error("Attachment message save failed", error);

    return NextResponse.json(
      {
        error: "Unable to upload file.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    return await handleUpload(request);
  } catch (error) {
    console.error("Chat upload failed", error);

    return NextResponse.json(
      {
        error: "Unable to upload file.",
      },
      {
        status: 500,
      }
    );
  }
}