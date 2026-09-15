import path from 'path';
import { execFile } from 'child_process';

const getExecutablePath = (platform: NodeJS.Platform): string => {
    switch (platform) {
        case 'win32':
            return path.join(__dirname, '../bin/win64/ffmpeg.exe');
        case 'linux':
            return path.join(__dirname, '../bin/linux64/ffmpeg');
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
};

const ffmpegPath = getExecutablePath(process.platform);

// Should match the RTSP URL of the media server and user credentials
const rtspUrl = 'rtsp://admin:admin123@localhost:8554/camera';

const args = [
    '-re',
    '-stream_loop', '-1',
    '-f', 'lavfi',
    '-i', 'testsrc=size=640x480:rate=30',
    '-vf', 'format=yuv420p',
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-x264-params', 'bframes=0',
    '-an',
    '-f', 'rtsp',
    '-rtsp_transport', 'tcp', 
    rtspUrl,
];

execFile(ffmpegPath, args, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
    }

    if (stderr) {
        console.log(`stderr: ${stderr}`);
    }

    if (stdout) {
        console.log(`stdout: ${stdout}`);
    }
});