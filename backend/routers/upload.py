from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import UploadResponse
from services.file_handler import save_upload, load_dataframe, get_file_stats, LARGE_FILE_THRESHOLD

router = APIRouter()

ALLOWED_EXTENSIONS = {".csv", ".json", ".tsv"}

# In-memory registry: file_id -> metadata
file_registry: dict = {}


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    from pathlib import Path
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    size_bytes = len(content)

    meta = save_upload(content, filename)
    file_id = meta["file_id"]

    try:
        df = load_dataframe(file_id, ext)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    stats = get_file_stats(df)

    file_registry[file_id] = {
        "file_id": file_id,
        "filename": filename,
        "ext": ext,
        "size_bytes": size_bytes,
        "is_large": size_bytes > LARGE_FILE_THRESHOLD,
    }

    return UploadResponse(
        file_id=file_id,
        filename=filename,
        rows=stats["rows"],
        cols=stats["cols"],
        size_bytes=size_bytes,
        size_mb=round(size_bytes / (1024 * 1024), 2),
        is_large=size_bytes > LARGE_FILE_THRESHOLD,
        missing_count=stats["missing_count"],
        duplicate_count=stats["duplicate_count"],
        columns=stats["columns"],
        dtypes=stats["dtypes"],
    )
