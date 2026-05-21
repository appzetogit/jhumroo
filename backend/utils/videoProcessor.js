import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { uploadToS3, getFileUrl, downloadFromS3 } from './s3.js';

/**
 * Process a reel: Download raw, merge with music, upload final
 * @param {string} videoId - Reel ID
 * @param {string} rawKey - S3 key for raw video
 * @param {object} music - Music metadata (url, startTime, duration)
 * @returns {Promise<object>} - Processed URLs
 */
export const processReelWithAudio = async (videoId, rawKey, music) => {
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
        const response = await axios({
          url: music.url,
          method: 'GET',
          responseType: 'stream'
        });
        const writer = fs.createWriteStream(audioLocalPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
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

    // 2.5. Check if raw video has an audio stream
    const hasAudio = await new Promise((resolve) => {
      ffmpeg.ffprobe(rawLocalPath, (err, metadata) => {
        if (err) {
          console.warn(`[Processor:${videoId}] ffprobe check for audio failed:`, err.message);
          resolve(false);
        } else {
          const audioStream = metadata.streams && metadata.streams.find(s => s.codec_type === 'audio');
          resolve(!!audioStream);
        }
      });
    });
    console.log(`[Processor:${videoId}] Raw video has audio stream: ${hasAudio}`);

    // 3. Merge Video and Audio using FFmpeg
    console.log(`[Processor:${videoId}] Starting FFmpeg merge...`);
    await new Promise((resolve, reject) => {
      let command = ffmpeg(rawLocalPath);

      if (audioReady) {
        // Precise seeking for the audio clip
        command = command
          .input(audioLocalPath)
          .inputOptions([
            `-ss ${music.startTime || 0}`,
            `-t ${music.duration || 15}`
          ])
          .outputOptions([
            '-map 0:v:0',    // Map video from first input
            '-map 1:a:0',    // Map audio from second input
            '-c:v libx264',  // Transcode video to H.264
            '-preset superfast',
            '-crf 23',
            '-c:a aac',      // Transcode audio to AAC
            '-b:a 128k',
            '-shortest',     // End when the shortest stream ends
            '-movflags +faststart' // Good for web streaming
          ]);
      } else {
        // Just convert to mp4 if no extra music
        if (hasAudio) {
          command = command
            .outputOptions([
              '-c:v libx264',
              '-preset superfast',
              '-crf 23',
              '-c:a aac',
              '-b:a 128k',
              '-movflags +faststart'
            ]);
        } else {
          command = command
            .outputOptions([
              '-c:v libx264',
              '-preset superfast',
              '-crf 23',
              '-an', // Disable audio stream in output since input has no audio stream
              '-movflags +faststart'
            ]);
        }
      }


      command
        .output(outputLocalPath)
        .on('start', (cmd) => console.log(`[Processor:${videoId}] FFmpeg Command:`, cmd))
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[Processor:${videoId}] Processing: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`[Processor:${videoId}] FFmpeg merge completed`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[Processor:${videoId}] FFmpeg Error:`, err);
          reject(err);
        })
        .run();
    });

    // 4. Generate Thumbnail from final video
    console.log(`[Processor:${videoId}] Generating thumbnail...`);
    await new Promise((resolve, reject) => {
      ffmpeg(outputLocalPath)
        .screenshots({
          count: 1,
          folder: tempDir,
          filename: 'thumbnail.jpg',
          size: '720x1280'
        })
        .on('end', resolve)
        .on('error', reject);
    });

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
      uploadToS3(thumbnailPath, `reels/thumbnails/${videoId}`, 'image/jpeg')
    ]);

    console.log(`[Processor:${videoId}] Upload complete. Video: ${videoUpload.url}`);

    return {
      videoUrl: videoUpload.url,
      videoKey: videoUpload.key,
      thumbnailUrl: thumbUpload.url,
      thumbnailKey: thumbUpload.key,
      duration: duration
    };

  } catch (err) {
    console.error(`[Processor:${videoId}] Processing failed:`, err);
    throw err;
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[Processor:${videoId}] Cleanup done`);
      }
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
