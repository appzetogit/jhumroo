import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a presigned URL for direct upload to S3
 */
export const getPresignedUploadUrl = async (key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (err) {
    console.error("Presigned URL Error:", err);
    throw new Error("Failed to generate upload URL");
  }
};

// Simple in-memory cache for signed URLs to speed up repeat requests
const urlCache = new Map();
const CACHE_TTL = 300000; // 5 minutes in ms

/**
 * Generate a signed URL for reading a private object
 */
export const getSignedReadUrl = async (key) => {
  const cached = urlCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.url;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 86400 });
    urlCache.set(key, { url, expiry: Date.now() + CACHE_TTL });
    return url;
  } catch (err) {
    console.error("Signed Read URL Error:", err);
    return null;
  }
};

/**
 * Generate a signed URL with response-content-disposition for forced download
 */
export const getPresignedDownloadUrl = async (key, filename) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (err) {
    console.error("Signed Download URL Error:", err);
    return null;
  }
};

/**
 * Get URL for an object (Synchronous version for CloudFront)
 */
export const getSyncFileUrl = (key) => {
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
  if (cdnDomain && key) {
    return `https://${cdnDomain}/${key}`;
  }
  return null;
};

/**
 * Convert any AWS S3 URL to CloudFront URL if CLOUDFRONT_DOMAIN is set
 * and strip out any S3 query signatures.
 */
export const convertToCdnUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
  if (!cdnDomain) return url;
  
  // If it's already a CloudFront URL, return it
  if (url.includes(cdnDomain)) return url;
  
  // If it contains AWS S3 domain pattern
  if (url.includes('amazonaws.com')) {
    // Extract the key part (everything after the hostname, excluding query parameters)
    const match = url.match(/https?:\/\/[^\/]+\/([^?]+)/);
    if (match && match[1]) {
      return `https://${cdnDomain}/${match[1]}`;
    }
  }
  return url;
};

/**
 * Get URL for an object (Signed if private S3, direct if CloudFront)
 */
export const getFileUrl = async (key) => {
  const syncUrl = getSyncFileUrl(key);
  if (syncUrl) return syncUrl;
  
  // If no CloudFront, we must use signed URLs if the bucket is private
  return await getSignedReadUrl(key);
};

/**
 * Upload a file to S3
 */
export const uploadToS3 = async (filePath, folder = 'reels', mimeType = 'video/mp4') => {
  const fileStream = fs.createReadStream(filePath);
  const fileName = `${Date.now()}-${path.basename(filePath)}`;
  const key = `${folder}/${fileName}`;

  try {
    console.log(`Starting S3 upload to bucket: ${process.env.AWS_BUCKET_NAME}, key: ${key}`);
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileStream,
        ContentType: mimeType,
      },
    });

    await upload.done();
    const url = await getFileUrl(key);
    console.log(`S3 upload done. URL: ${url}`);

    return { url, key, fileName };
  } catch (err) {
    console.error("S3 Upload Error Details:", {
      message: err.message,
      code: err.code,
      requestId: err.$metadata?.requestId,
      bucket: process.env.AWS_BUCKET_NAME,
      key
    });
    throw new Error(`Failed to upload file to S3: ${err.message}`);
  }
};

/**
 * Download a file from S3 to a local path
 */
export const downloadFromS3 = async (key, localPath) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await s3Client.send(command);
    const writer = fs.createWriteStream(localPath);
    
    return new Promise((resolve, reject) => {
      response.Body.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (err) {
    console.error("S3 Download Error:", err);
    throw new Error(`Failed to download file from S3: ${err.message}`);
  }
};

/**
 * Delete a file from S3
 */
export const deleteFromS3 = async (key) => {
  if (!key) return;
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
    console.log(`Successfully deleted object from S3: ${key}`);
    return true;
  } catch (err) {
    console.error("S3 Delete Error:", err);
    return false;
  }
};
