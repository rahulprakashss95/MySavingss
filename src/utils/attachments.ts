/**
 * Previewing and sharing an attachment, independent of where its bytes are.
 *
 * Two screens need this and they hold files at different stages: the list only
 * ever shows stored files, while the add/edit form also holds picks that aren't
 * uploaded yet. `ViewableFile` is what lets one viewer serve both — it carries
 * the source along with the file, so callers never branch on it.
 */

import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import {
  downloadAttachment,
  getAttachmentUrl,
  type StagedFile,
} from "../../database/query";
import type { Attachment } from "../models/common";
import { showToast } from "./Utils";

/** A file the app can preview or share, wherever it currently lives. */
export type ViewableFile = {
  /** Stable per file, for list keys and url caches. */
  key: string;
  name: string;
  mime: string;
  source:
    | { kind: "local"; uri: string }
    | { kind: "stored"; attachment: Attachment };
};

/** A file already in the bucket. */
export const storedFile = (attachment: Attachment): ViewableFile => ({
  key: attachment.id,
  name: attachment.name,
  mime: attachment.mime,
  source: { kind: "stored", attachment },
});

/** A file picked this session and not yet uploaded. */
export const localFile = (key: string, file: StagedFile): ViewableFile => ({
  key,
  name: file.name,
  mime: file.mime,
  source: { kind: "local", uri: file.uri },
});

/**
 * A uri that can be rendered or opened. Stored files get a fresh signed URL —
 * the bucket is private and links expire — while a local pick is already
 * readable where it sits.
 */
export const viewUrl = (file: ViewableFile): Promise<string> =>
  file.source.kind === "local"
    ? Promise.resolve(file.source.uri)
    : getAttachmentUrl(file.source.attachment.path);

/**
 * Saves the bytes to the user's downloads, for when the browser can't share a
 * file. The blob is what makes this work: `download` is ignored on a
 * cross-origin href, so pointing an anchor at the Supabase URL would navigate
 * to the file instead of saving it.
 */
const downloadInBrowser = (blob: Blob, name: string) => {
  const doc = globalThis.document;
  if (!doc) {
    return;
  }
  const blobUrl = URL.createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = blobUrl;
  anchor.download = name;
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download before it starts.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
};

/**
 * Shares the actual file on the web, via the Web Share API's `files`.
 *
 * Emphatically NOT `share({ url })`: that sends a *link*, so WhatsApp shows a
 * URL that opens a browser tab rather than an image the recipient can save —
 * and because the url is a signed one, it would rot within minutes anyway.
 * Sharing `files` means the bytes leave with the message.
 */
const shareOnWeb = async (file: ViewableFile, uri: string) => {
  const webNavigator = globalThis.navigator;
  const blob = await (await fetch(uri)).blob();
  // The DOM File, not expo-file-system's — this module deliberately imports
  // neither, so the global is the web one.
  const shareable = new File([blob], file.name, { type: file.mime });

  // `canShare` must be asked about the actual file: browsers that support
  // sharing text still reject files, and Safari rejects some types outright.
  if (webNavigator?.canShare?.({ files: [shareable] })) {
    await webNavigator.share({ files: [shareable], title: file.name });
    return;
  }
  // Most desktop browsers land here. Saving the real file is the honest
  // fallback — the user can then attach it wherever they meant to.
  downloadInBrowser(blob, file.name);
};

/**
 * Hands a file to the OS share sheet, so it travels as a file rather than a
 * link. Stored files are downloaded first because both share paths need real
 * bytes; a local pick already has them and can be shared before its record is
 * ever saved.
 */
export const shareFile = async (file: ViewableFile): Promise<void> => {
  try {
    const uri =
      file.source.kind === "local"
        ? file.source.uri
        : await downloadAttachment(file.source.attachment);

    if (Platform.OS === "web") {
      await shareOnWeb(file, uri);
      return;
    }

    if (!(await Sharing.isAvailableAsync())) {
      showToast(
        "error",
        "Sharing unavailable",
        "This device can't share files.",
        "bottom"
      );
      return;
    }
    // `uri` is a local file here — expo-sharing rejects remote URLs — so this
    // already shares bytes, and the recipient gets a real image or PDF.
    await Sharing.shareAsync(uri, { mimeType: file.mime, dialogTitle: file.name });
  } catch (error) {
    // Dismissing the share sheet rejects; that's a choice, not a fault.
    if ((error as Error)?.name !== "AbortError") {
      showToast("error", "Unable to share", String(error), "bottom");
    }
  }
};
