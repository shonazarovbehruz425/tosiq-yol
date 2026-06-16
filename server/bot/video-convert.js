// Convert a WebM (VP8/VP9) replay buffer into an MP4 (H.264) so it looks crisp
// in Telegram instead of the blurry low-bitrate WebM. Uses the bundled static
// ffmpeg binary (ffmpeg-static) — no system ffmpeg install required.
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

let ffmpegPath = null;
try {
  // ffmpeg-static default-exports the absolute path to the binary.
  const mod = await import('ffmpeg-static');
  ffmpegPath = mod.default || mod;
} catch (e) {
  console.warn('[video] ffmpeg-static not available:', e.message);
}

export function isConversionAvailable() {
  return !!ffmpegPath && fs.existsSync(ffmpegPath);
}

// Returns a Promise<Buffer> of the MP4, or rejects on failure.
export function webmToMp4(webmBuffer) {
  return new Promise((resolve, reject) => {
    if (!isConversionAvailable()) {
      reject(new Error('ffmpeg not available'));
      return;
    }

    const tmp = os.tmpdir();
    const inPath = path.join(tmp, `replay-${randomUUID()}.webm`);
    const outPath = path.join(tmp, `replay-${randomUUID()}.mp4`);

    const cleanup = () => {
      try { fs.existsSync(inPath) && fs.unlinkSync(inPath); } catch (_) {}
      try { fs.existsSync(outPath) && fs.unlinkSync(outPath); } catch (_) {}
    };

    try {
      fs.writeFileSync(inPath, webmBuffer);
    } catch (e) {
      cleanup();
      reject(e);
      return;
    }

    // H.264 + yuv420p so it plays everywhere (Telegram, iOS, Android).
    // AAC audio so the recorded move/wall sounds are preserved.
    // MediaRecorder emits a VARIABLE-framerate webm; without forcing a constant
    // output framerate ffmpeg replays it too fast. -fps_mode cfr -r 30 (with a
    // fallback to -vsync cfr on older ffmpeg) resamples to real-time CFR.
    // -movflags +faststart puts the index up front for instant playback.
    const args = [
      '-y',
      '-fflags', '+genpts',
      '-i', inPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-crf', '18',
      '-vsync', 'cfr',
      '-r', '30',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      // Pad odd dimensions to even (H.264 requirement).
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      outPath
    ];

    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => { cleanup(); reject(err); });
    proc.on('close', (code) => {
      if (code !== 0) {
        cleanup();
        reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-300)}`));
        return;
      }
      try {
        const out = fs.readFileSync(outPath);
        cleanup();
        resolve(out);
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  });
}
