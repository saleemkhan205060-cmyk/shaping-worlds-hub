// Only recognized app-owned errors are mapped. Unknown platform errors remain unchanged.
const videoPickerErrors: Readonly<Record<string, string>> = {
  "Couldn't load video": "media.loadVideoFailed",
  "Canvas unsupported": "media.canvasUnsupported",
  "Couldn't read video frames": "media.readFramesFailed",
  "Video not ready": "media.videoNotReady",
  "Couldn't capture frame": "media.captureFailed",
  "This video can't be captured here due to security restrictions.": "media.captureRestricted",
  "Please pick an image": "media.pickImage",
};

export function videoPickerErrorKey(message: string): string | undefined {
  return Object.hasOwn(videoPickerErrors, message) ? videoPickerErrors[message] : undefined;
}