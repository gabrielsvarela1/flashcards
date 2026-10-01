import { IMAGE_MAX_SIDE, MAX_IMAGE_BYTES } from "@/lib/limits";

/**
 * Reduz uma foto no browser para JPEG com o lado maior até IMAGE_MAX_SIDE.
 * As fotos do telemóvel têm vários MB e o pedido ao servidor está limitado.
 */
export async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.8, 0.6, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_IMAGE_BYTES) {
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("A foto é demasiado grande.");
}
