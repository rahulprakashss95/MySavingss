import type { StagedFile } from "../../database/query";

/**
 * Interactive square cropper — WEB ONLY. See `ImageCropper.web.tsx` for the
 * real implementation.
 *
 * On iOS and Android the picker's own editor (`allowsEditing`) does the crop,
 * so this component is never rendered there. This native stub exists only so
 * the `./ImageCropper` import resolves on device; Metro swaps in the `.web`
 * file when bundling for web.
 */
export type ImageCropperProps = {
  visible: boolean;
  uri: string | null;
  onCancel: () => void;
  onCropped: (file: StagedFile) => void;
};

const ImageCropper = (_props: ImageCropperProps) => null;

export default ImageCropper;
