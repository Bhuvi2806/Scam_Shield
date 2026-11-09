"""Image validation, sanitization, and in-memory preprocessing for OCR.

Protects against decompression bombs, strips EXIF/GPS metadata in memory,
validates magic bytes, and enhances contrast/resolution for Tesseract.
Strictly processes in memory without creating temporary disk files.
"""

from __future__ import annotations

import io

from PIL import Image, ImageEnhance, ImageOps

from app.core.constants import (
    ALLOWED_IMAGE_FORMATS,
    MAX_IMAGE_BYTES,
    MAX_IMAGE_PIXELS,
    OCR_MIN_UPSCALE_DIMENSION,
)

# Enforce decompression-bomb ceiling at PIL module level
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


class ImageValidationError(Exception):
    """Base exception for image validation failures."""


class ImageSizeError(ImageValidationError):
    """Raised when file bytes or pixel dimensions exceed safety limits."""


class ImageFormatError(ImageValidationError):
    """Raised when image format magic bytes are not in allowed list."""


class ImageCorruptError(ImageValidationError):
    """Raised when image cannot be decoded by PIL."""


def validate_and_sanitize_image(image_bytes: bytes) -> Image.Image:
    """Validate image bytes in memory, strip metadata, and return a clean PIL Image.

    Rules:
    - Enforce MAX_IMAGE_BYTES
    - Verify image magic bytes via PIL decode (PNG, JPEG, WEBP only)
    - Guard against decompression bombs (MAX_IMAGE_PIXELS)
    - Apply EXIF orientation correction then strip all EXIF/metadata
    - Strictly in-memory: no disk I/O, no temporary files
    """
    if not image_bytes:
        raise ImageCorruptError("Uploaded file is empty (0 bytes).")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        max_mb = MAX_IMAGE_BYTES // (1024 * 1024)
        raise ImageSizeError(
            f"Image file size ({len(image_bytes):,} bytes) exceeds maximum allowed limit of {max_mb} MB."
        )

    buffer = io.BytesIO(image_bytes)
    try:
        with Image.open(buffer) as raw_img:
            # 1. Verify format magic bytes (PIL sets .format from file header, not filename)
            detected_format = raw_img.format
            if (
                not detected_format
                or detected_format.upper() not in ALLOWED_IMAGE_FORMATS
            ):
                allowed_str = ", ".join(sorted(ALLOWED_IMAGE_FORMATS))
                raise ImageFormatError(
                    f"Unsupported image format '{detected_format}'. Allowed formats: {allowed_str}."
                )

            # 2. Decompression-bomb check on width * height
            width, height = raw_img.size
            if width * height > MAX_IMAGE_PIXELS:
                raise ImageSizeError(
                    f"Image resolution ({width}x{height} = {width * height:,} pixels) exceeds "
                    f"maximum allowed limit of {MAX_IMAGE_PIXELS:,} pixels."
                )

            # 3. Apply EXIF orientation transform if orientation metadata is present
            oriented_img = ImageOps.exif_transpose(raw_img)
            if oriented_img is None:
                oriented_img = raw_img

            # 4. Strip EXIF/metadata: copy raw pixels into a pristine in-memory Image
            # Ensure standard RGB mode (or L for grayscale)
            if oriented_img.mode in ("RGBA", "LA", "P"):
                # Handle transparency by pasting onto clean white background
                clean_img = Image.new("RGB", oriented_img.size, (255, 255, 255))
                if oriented_img.mode == "P":
                    converted = oriented_img.convert("RGBA")
                    clean_img.paste(converted, mask=converted.split()[3])
                elif oriented_img.mode == "LA":
                    clean_img.paste(
                        oriented_img.convert("RGBA"), mask=oriented_img.split()[1]
                    )
                else:
                    clean_img.paste(oriented_img, mask=oriented_img.split()[3])
            elif oriented_img.mode == "L":
                clean_img = oriented_img.copy()
            else:
                clean_img = oriented_img.convert("RGB")

            # Verify clean_img has no info/exif dict attached
            clean_img.info.clear()
            return clean_img

    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as e:
        raise ImageSizeError(f"Decompression bomb detected: {e}") from e
    except (ImageFormatError, ImageSizeError, ImageCorruptError):
        raise
    except Exception as e:
        raise ImageCorruptError(f"Failed to decode image data: {e}") from e
    finally:
        buffer.close()


def preprocess_for_ocr(img: Image.Image) -> Image.Image:
    """Preprocess PIL Image in memory to maximize Tesseract character recognition.

    Operations:
    1. Grayscale conversion ('L')
    2. Dynamic upscaling if minimum dimension < OCR_MIN_UPSCALE_DIMENSION
    3. Contrast stretching / enhancement
    """
    # 1. Grayscale
    gray = img.convert("L")

    # 2. Upscale small images to help Tesseract segment small Devanagari & Latin text
    width, height = gray.size
    min_dim = min(width, height)
    if min_dim < OCR_MIN_UPSCALE_DIMENSION:
        scale = OCR_MIN_UPSCALE_DIMENSION / min_dim
        # Cap scale at 3x to prevent excessive memory usage
        scale = min(scale, 3.0)
        new_width = int(width * scale)
        new_height = int(height * scale)
        gray = gray.resize((new_width, new_height), resample=Image.Resampling.BICUBIC)

    # 3. Contrast enhancement
    enhancer = ImageEnhance.Contrast(gray)
    enhanced = enhancer.enhance(1.8)

    return enhanced
