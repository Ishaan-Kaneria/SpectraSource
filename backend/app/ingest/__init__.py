import io
from dataclasses import dataclass


class UnsupportedSource(ValueError):
    pass


@dataclass
class ExtractedSource:
    kind: str
    name: str | None
    text: str


TEXT_EXT = {".txt", ".md", ".csv", ".json", ".html", ".htm", ".log"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".mp3", ".wav", ".m4a"}


def extract(filename: str, data: bytes) -> ExtractedSource:
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext == ".pdf":
        return ExtractedSource("pdf", filename, _pdf(data))
    if ext == ".docx":
        return ExtractedSource("docx", filename, _docx(data))
    if ext in TEXT_EXT:
        return ExtractedSource("text", filename, data.decode("utf-8", errors="replace"))
    if ext in IMAGE_EXT:
        # TODO: OCR (Tesseract) + vision captioning so screenshots and posters become text.
        raise UnsupportedSource("Image input is not wired up yet (planned: OCR + vision captioning).")
    if ext in VIDEO_EXT:
        # TODO: speech-to-text (Whisper) + keyframe captions.
        raise UnsupportedSource("Video/audio input is not wired up yet (planned: Whisper transcription).")
    raise UnsupportedSource(f"Unsupported file type: {ext or filename}")


def _pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n\n".join((page.extract_text() or "") for page in reader.pages)


def _docx(data: bytes) -> str:
    import docx

    d = docx.Document(io.BytesIO(data))
    parts = [p.text for p in d.paragraphs if p.text.strip()]
    for table in d.tables:
        for row in table.rows:
            parts.append(" | ".join(c.text.strip() for c in row.cells))
    return "\n".join(parts)
