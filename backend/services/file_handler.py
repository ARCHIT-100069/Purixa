import os
import uuid
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any

TEMP_DIR = Path(__file__).parent.parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)

LARGE_FILE_THRESHOLD = 50 * 1024 * 1024  # 50MB


def get_temp_path(file_id: str, suffix: str = "") -> Path:
    return TEMP_DIR / f"{file_id}{suffix}"


def save_upload(content: bytes, filename: str) -> Dict[str, Any]:
    """Save uploaded file and return metadata."""
    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower()
    dest = get_temp_path(file_id, ext)
    dest.write_bytes(content)
    return {
        "file_id": file_id,
        "path": dest,
        "ext": ext,
        "size_bytes": len(content),
    }


def load_dataframe(file_id: str, ext: str) -> pd.DataFrame:
    """Load a file into a DataFrame based on extension."""
    path = get_temp_path(file_id, ext)
    if ext == ".csv":
        return pd.read_csv(path, low_memory=False)
    elif ext == ".tsv":
        return pd.read_csv(path, sep="\t", low_memory=False)
    elif ext == ".json":
        return pd.read_json(path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")


def get_file_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute basic stats for the DataFrame."""
    missing_count = int(df.isnull().sum().sum())
    duplicate_count = int(df.duplicated().sum())
    dtypes = {col: _dtype_label(str(df[col].dtype)) for col in df.columns}
    return {
        "rows": len(df),
        "cols": len(df.columns),
        "missing_count": missing_count,
        "duplicate_count": duplicate_count,
        "columns": list(df.columns),
        "dtypes": dtypes,
    }


def _dtype_label(dtype_str: str) -> str:
    if dtype_str.startswith("int") or dtype_str.startswith("float"):
        return "numeric"
    elif dtype_str.startswith("datetime"):
        return "date"
    else:
        return "text"


def save_cleaned(file_id: str, df: pd.DataFrame) -> Tuple[Path, Path]:
    """Save cleaned DataFrame as CSV and JSON. Returns (csv_path, json_path)."""
    csv_path = get_temp_path(file_id, "_cleaned.csv")
    json_path = get_temp_path(file_id, "_cleaned.json")
    df.to_csv(csv_path, index=False)
    df.to_json(json_path, orient="records", indent=2)
    return csv_path, json_path


def cleanup_files(file_id: str):
    """Remove all temp files for a given file_id."""
    for f in TEMP_DIR.glob(f"{file_id}*"):
        try:
            f.unlink()
        except Exception:
            pass


def detect_file_size(file_id: str, ext: str) -> int:
    path = get_temp_path(file_id, ext)
    return path.stat().st_size if path.exists() else 0
