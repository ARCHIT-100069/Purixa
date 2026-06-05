from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class CleanRequest(BaseModel):
    file_id: str
    remove_duplicates: bool = True
    handle_missing: bool = True
    fix_dtypes: bool = True
    normalize_text: bool = True
    remove_outliers: bool = False
    fix_formatting: bool = True


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    rows: int
    cols: int
    size_bytes: int
    size_mb: float
    is_large: bool
    missing_count: int
    duplicate_count: int
    columns: List[str]
    dtypes: Dict[str, str]


class CleanResponse(BaseModel):
    job_id: str
    file_id: str
    status: str = "queued"


class CleaningStats(BaseModel):
    rows_before: int = 0
    rows_after: int = 0
    duplicates_removed: int = 0
    missing_filled: int = 0
    outliers_removed: int = 0
    rows_removed: int = 0


class StatusResponse(BaseModel):
    job_id: str
    status: str  # queued | running | done | error
    progress: int
    log: List[str]
    stats: CleaningStats
    error: Optional[str] = None


class PreviewResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    column_types: Dict[str, str]
    stats: CleaningStats
    summary: List[str]
