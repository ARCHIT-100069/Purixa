import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from models.schemas import PreviewResponse, CleaningStats
from services.file_handler import get_temp_path, cleanup_files, TEMP_DIR
from routers.clean import jobs

router = APIRouter()


def _get_job(job_id: str) -> dict:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    if job["status"] != "done":
        raise HTTPException(
            status_code=202,
            detail=f"Job is not complete yet (status={job['status']})"
        )
    return job


def _get_cleaned_csv_path(file_id: str) -> Path:
    path = TEMP_DIR / f"{file_id}_cleaned.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Cleaned file not found")
    return path


def _get_cleaned_json_path(file_id: str) -> Path:
    path = TEMP_DIR / f"{file_id}_cleaned.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Cleaned JSON file not found")
    return path


@router.get("/preview/{job_id}", response_model=PreviewResponse)
async def preview(job_id: str):
    import pandas as pd
    job = _get_job(job_id)
    file_id = job["file_id"]
    csv_path = _get_cleaned_csv_path(file_id)

    df = pd.read_csv(csv_path, nrows=20)
    full_df = pd.read_csv(csv_path)
    total_rows = len(full_df)

    def dtype_label(dtype_str: str) -> str:
        s = str(dtype_str)
        if s.startswith("int") or s.startswith("float"):
            return "numeric"
        elif s.startswith("datetime"):
            return "date"
        return "text"

    column_types = {col: dtype_label(str(df[col].dtype)) for col in df.columns}
    rows = df.where(df.notna(), None).to_dict(orient="records")

    stats = job["stats"]
    summary = _build_summary(stats, job.get("log", []))

    return PreviewResponse(
        columns=list(df.columns),
        rows=rows,
        total_rows=total_rows,
        column_types=column_types,
        stats=CleaningStats(**stats),
        summary=summary,
    )


def _build_summary(stats: dict, log: list) -> list:
    items = []
    if stats.get("duplicates_removed", 0):
        items.append(f"Removed {stats['duplicates_removed']:,} duplicate rows")
    if stats.get("missing_filled", 0):
        items.append(f"Filled {stats['missing_filled']:,} missing values")
    if stats.get("outliers_removed", 0):
        items.append(f"Removed {stats['outliers_removed']:,} outlier rows")
    if stats.get("rows_removed", 0):
        items.append(f"Total rows removed: {stats['rows_removed']:,}")
    if stats.get("rows_after", 0):
        items.append(f"Final dataset: {stats['rows_after']:,} rows")
    return items


@router.get("/download/{job_id}")
async def download(job_id: str, format: str = "csv"):
    job = _get_job(job_id)
    file_id = job["file_id"]

    if format == "json":
        path = _get_cleaned_json_path(file_id)
        media_type = "application/json"
        filename = f"purixa_cleaned_{file_id[:8]}.json"
    else:
        path = _get_cleaned_csv_path(file_id)
        media_type = "text/csv"
        filename = f"purixa_cleaned_{file_id[:8]}.csv"

    def file_streamer(path: Path, chunk_size: int = 64 * 1024):
        with open(path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(
        file_streamer(path),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/cleanup/{file_id}")
async def cleanup(file_id: str):
    cleanup_files(file_id)
    return {"message": f"Cleaned up files for file_id={file_id}"}
