import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { uploadToS3, getFileUrl, downloadFromS3 } from './s3.js';

const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

/** https URL on our CDN / S3 / Cloudinary, or a host listed in AUDIO_ALLOWED_HOSTS (comma-separated). */
export const isTrustedMediaUrl = (raw) => {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  const extra = (process.env.AUDIO_ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  return host === (process.env.CLOUDFRONT_DOMAIN || '').toLowerCase() ||
    /(^|\.)s3[.-][a-z0-9.-]*amazonaws\.com$/.test(host) ||
    host === 'res.cloudinary.com' ||
    extra.includes(host);
};

/**
 * Process a reel: Download raw, merge with music, upload final
 * @param {string} videoId - Reel ID
 * @param {string} rawKey - S3 key for raw video
 * @param {object} music - Music metadata (url, startTime, duration)
 * @param {object} [opts] - { hd: true } for premium creators: keep up to 1080p at higher quality;
 *                          { thumbnail: false } when the client already sent a cover
 * @returns {Promise<object>} - Processed URLs
 */
// ponytail: in-process encode queue — per Node process and lost on restart.
// Upgrade to a BullMQ worker (already in package.json) once Redis runs on the VPS.
const MAX_ENCODES = Number(process.env.MAX_CONCURRENT_ENCODES) || 1;
let runningEncodes = 0;
const waitingEncodes = [];
export const withEncodeSlot = async (fn) => {
  if (runningEncodes >= MAX_ENCODES) await new Promise((resolve) => waitingEncodes.push(resolve));
  runningEncodes++;
  try { return await fn(); } finally { runningEncodes--; waitingEncodes.shift()?.(); }
};

const probe = (file) => new Promise((resolve) => ffmpeg.ffprobe(file, (err, meta) => resolve(err ? null : meta)));

/** Copy the picture instead of re-encoding: H.264, short side within the cap, sane bitrate (bps, whole file). */
export const canCopyVideo = (v, bitrate, maxW) =>
  v?.codec_name === 'h264' && Math.min(v.width, v.height) <= maxW && bitrate > 0 && bitrate <= 8_500_000;

export const processReelWithAudio = (videoId, rawKey, music, opts = {}) =>
  withEncodeSlot(() => encodeReel(videoId, rawKey, music, opts));

const encodeReel = async (videoId, rawKey, music, opts = {}) => {
  // Standard: 720p, crf 23. Premium (Ultra HD): 1080p, crf 18 (visually lossless), slower preset for detail.
  // -threads caps CPU per encode so uploads never starve the API on a 4-core VPS.
  const maxW = opts.hd ? 1080 : 720;
  const threads = `-threads ${Number(process.env.FFMPEG_THREADS) || 2}`;
  const quality = opts.hd ? ['-preset veryfast', '-crf 18', threads] : ['-preset superfast', '-crf 23', threads];
  const tempDir = path.join('temp', videoId.toString());
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const rawLocalPath = path.join(tempDir, 'raw_video.webm');
  const audioLocalPath = path.join(tempDir, 'audio.mp3');
  const outputLocalPath = path.join(tempDir, 'final_video.mp4');
  const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');

  try {
    // 1. Download raw video from S3
    console.log(`[Processor:${videoId}] Downloading raw video from S3: ${rawKey}`);
    await downloadFromS3(rawKey, rawLocalPath);

    // 2. Prepare audio if needed
    let audioReady = false;
    if (music && music.url) {
      console.log(`[Processor:${videoId}] Downloading audio from: ${music.url}`);
      try {
        // music.url comes from the client: only fetch from our own media hosts (SSRF guard).
        if (!isTrustedMediaUrl(music.url)) throw new Error(`Untrusted audio host: ${music.url}`);
        const response = await axios({
          url: music.url,
          method: 'GET',
          responseType: 'stream',
          timeout: 30000,
          maxRedirects: 0
        });
        const writer = fs.createWriteStream(audioLocalPath);
        let bytes = 0;
        response.data.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > MAX_AUDIO_BYTES) response.data.destroy(new Error('Audio file too large'));
        });
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
          response.data.on('error', reject);
        });
        audioReady = true;
        console.log(`[Processor:${videoId}] Audio downloaded successfully`);
      } catch (audioErr) {
        console.error(`[Processor:${videoId}] Audio download failed:`, audioErr.message);
        // Continue without audio if download fails? Or fail? 
        // For now, let's fail to ensure the user gets what they want.
        throw audioErr;
      }
    }

    // 2.5. Probe the upload once: audio stream, and whether the picture can be copied as-is.
    const meta = await probe(rawLocalPath);
    if (!meta) console.warn(`[Processor:${videoId}] ffprobe failed, re-encoding`);
    const videoStream = meta?.streams?.find((s) => s.codec_type === 'video');
    const audioStream = meta?.streams?.find((s) => s.codec_type === 'audio');
    const hasAudio = !!audioStream;
    const copyVideo = canCopyVideo(videoStream, Number(meta?.format?.bit_rate) || 0, maxW);
    console.log(`[Processor:${videoId}] audio: ${hasAudio}, video: ${copyVideo ? 'copy' : 'x264'}`);

    // 3. Mux. App uploads are already H.264 at the right size, so the picture is copied (seconds, no CPU);
    // only odd uploads (old app builds, HEVC, 4K, huge bitrate) still go through x264.
    console.log(`[Processor:${videoId}] Starting FFmpeg merge...`);
    await new Promise((resolve, reject) => {
      let command = ffmpeg(rawLocalPath).inputOptions([threads]); // caps decode threads too, not just x264
      const video = copyVideo ? ['-c:v copy'] : ['-c:v libx264', ...quality];
      let audio;
      if (audioReady) {
        command = command.input(audioLocalPath).inputOptions([`-ss ${music.startTime || 0}`, `-t ${music.duration || 15}`]);
        audio = ['-map 0:v:0', '-map 1:a:0', '-c:a aac', '-b:a 128k', '-shortest'];
      } else if (hasAudio) {
        audio = audioStream.codec_name === 'aac' ? ['-c:a copy'] : ['-c:a aac', '-b:a 128k'];
      } else {
        audio = ['-an'];
      }
      command = command.outputOptions([...video, ...audio, '-movflags +faststart']);
      // Cap width (720 standard / 1080 premium) when re-encoding; filters can't run on a copied stream.
      if (!copyVideo) command = command.videoFilters(`scale='min(${maxW},iw)':-2`);

      command
        .output(outputLocalPath)
        .on('start', (cmd) => console.log(`[Processor:${videoId}] FFmpeg Command:`, cmd))
        .on('end', () => {
          console.log(`[Processor:${videoId}] FFmpeg merge completed`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[Processor:${videoId}] FFmpeg Error:`, err);
          reject(err);
        })
        .renice(10) // below the API and the other project on this shared VPS
        .run();
    });

    // 4. Thumbnail only when the client didn't send a cover
    const makeThumb = opts.thumbnail !== false;
    if (makeThumb) {
      console.log(`[Processor:${videoId}] Generating thumbnail...`);
      await new Promise((resolve, reject) => {
        ffmpeg(outputLocalPath)
          .screenshots({ count: 1, folder: tempDir, filename: 'thumbnail.jpg', size: '720x1280' })
          .on('end', resolve)
          .on('error', reject);
      });
    }

    // 5. Get duration using ffprobe
    console.log(`[Processor:${videoId}] Probing for duration...`);
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(outputLocalPath, (err, metadata) => {
        if (err) {
          console.warn(`[Processor:${videoId}] ffprobe failed:`, err.message);
          resolve(0); // Fallback to 0 if probe fails
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });

    // 6. Upload final results to S3
    console.log(`[Processor:${videoId}] Uploading processed files to S3...`);
    
    // We upload to a dedicated processed folder
    const [videoUpload, thumbUpload] = await Promise.all([
      uploadToS3(outputLocalPath, `reels/processed/${videoId}`, 'video/mp4'),
      makeThumb ? uploadToS3(thumbnailPath, `reels/thumbnails/${videoId}`, 'image/jpeg') : null
    ]);

    console.log(`[Processor:${videoId}] Upload complete. Video: ${videoUpload.url}`);

    return {
      videoUrl: videoUpload.url,
      videoKey: videoUpload.key,
      thumbnailUrl: thumbUpload?.url,
      thumbnailKey: thumbUpload?.key,
      duration: duration
    };

  } catch (err) {
    console.error(`[Processor:${videoId}] Processing failed:`, err);
    throw err;
  } finally {
    // Cleanup
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error(`[Processor:${videoId}] Cleanup failed:`, cleanupErr);
    }
  }
};

/**
 * Legacy process function (kept for compatibility)
 */
export const processVideo = async (videoId, localPath) => {
  return processReelWithAudio(videoId, localPath, null);
};
