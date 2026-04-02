/**
 * lib/media/index.ts
 * Public API for the media library.
 */

export { compressImage, compressImages, type CompressOptions } from "./compress";
export {
  uploadMedia,
  deleteMedia,
  type UploadMediaInput,
  type UploadMediaResult,
  type FeatureType,
} from "./upload";
