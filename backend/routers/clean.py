import asyncio
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.schemas import CleanRequest, CleanResponse, StatusResponse, CleaningStats
from services.file_handler import (
    load_dataframe,
    save_cleaned,
    get_temp_path,
    LARGE_FILE_THRESHOLD,
)
from services.cleaner import clean_dataframe
from services.chunked_cleaner import clean_chunked

router = APIRouter()

# In-memory job store: job_id -> job state dict
jobs: dict = {}
# file_id -> metadata (shared with upload router)
file_registry: dict = {}


def _get_file_meta(file_id: str) -> dict:
    """Try to find file metadata by scanning temp dir."""
    from services.file_handler import TEMP_DIR
    for ext in [".csv", ".tsv", ".json"]:
        path = TEMP_DIR / f"{file_id}{ext}"
        if path.exists():
            size = path.stat().st_size
            return {"ext": ext, "size_bytes": size, "path": path}
    return {}


def _run_clean_job(job_id: str, file_id: str, config: dict):
    """Background task that runs cleaning and updates job state."""
    job = jobs[job_id]
    job["status"] = "running"
    job["progress"] = 1
    job["log"].append("⟳ Starting cleaning pipeline...")

    try:
        meta = _get_file_meta(file_id)
        if not meta:
            raise FileNotFoundError(f"No temp file found for file_id={file_id}")

        ext = meta["ext"]
        size_bytes = meta["size_bytes"]
        is_large = size_bytes > LARGE_FILE_THRESHOLD

        if is_large:
            job["log"].append(f"⟳ Large file detected ({size_bytes/(1024*1024):.1f} MB) — using chunked processing")

            def progress_cb(pct: int, msg: str):
                job["progress"] = pct
                job["log"].append(msg)

            result = clean_chunked(
                file_path=meta["path"],
                ext=ext,
                config=config,
                progress_callback=progress_cb,
            )
        else:
            job["log"].append("⟳ Loading file into memory...")
            job["progress"] = 10
            df = load_dataframe(file_id, ext)
            job["log"].append(f"✓ Loaded {len(df):,} rows × {len(df.columns)} columns")
            job["progress"] = 20

            result = clean_dataframe(df, config)
            job["progress"] = 85
            for line in result["log"]:
                job["log"].append(line)

        df_cleaned = result["df"]
        job["log"].append("⟳ Saving cleaned file...")
        job["progress"] = 95
        save_cleaned(file_id, df_cleaned)

        # Store result DF shape in job for preview
        job["result_shape"] = (len(df_cleaned), len(df_cleaned.columns))
        job["stats"] = result["stats"]
        for line in result.get("log", []):
            if line not in job["log"]:
                job["log"].append(line)
        job["log"].append(f"✓ Done! {len(df_cleaned):,} rows in output")
        job["progress"] = 100
        job["status"] = "done"

    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
        job["log"].append(f"✗ Error: {str(e)}")


@router.post("/clean/{file_id}", response_model=CleanResponse)
async def start_cleaning(
    file_id: str,
    request: CleanRequest,
    background_tasks: BackgroundTasks,
):
    meta = _get_file_meta(file_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"File not found: {file_id}")

    job_id = str(uuid.uuid4())
    config = {
        "remove_duplicates": request.remove_duplicates,
        "handle_missing": request.handle_missing,
        "fix_dtypes": request.fix_dtypes,
        "normalize_text": request.normalize_text,
        "remove_outliers": request.remove_outliers,
        "fix_formatting": request.fix_formatting,
    }

    jobs[job_id] = {
        "job_id": job_id,
        "file_id": file_id,
        "status": "queued",
        "progress": 0,
        "log": [],
        "stats": {
            "rows_before": 0,
            "rows_after": 0,
            "duplicates_removed": 0,
            "missing_filled": 0,
            "outliers_removed": 0,
            "rows_removed": 0,
        },
        "error": None,
    }

    background_tasks.add_task(_run_clean_job, job_id, file_id, config)

    return CleanResponse(job_id=job_id, file_id=file_id, status="queued")


@router.get("/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

    return StatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        log=job["log"],
        stats=CleaningStats(**job["stats"]),
        error=job.get("error"),
    )
