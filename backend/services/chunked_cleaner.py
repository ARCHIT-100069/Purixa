import re
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Callable


def clean_chunked(
    file_path: Path,
    ext: str,
    config: Dict[str, bool],
    progress_callback: Callable[[int, str], None],
    chunksize: int = 10000,
) -> Dict[str, Any]:
    """
    Process large files in chunks. Returns cleaned DataFrame + stats.
    progress_callback(progress_pct: int, message: str)
    """
    stats = {
        "rows_before": 0,
        "rows_after": 0,
        "duplicates_removed": 0,
        "missing_filled": 0,
        "outliers_removed": 0,
        "rows_removed": 0,
    }
    log: List[str] = []

    # --- Count total rows for progress ---
    progress_callback(2, "⟳ Scanning file size...")
    total_rows = _count_rows(file_path, ext)
    stats["rows_before"] = total_rows
    chunks_total = max(1, (total_rows // chunksize) + 1)
    log.append(f"✓ Detected {total_rows:,} rows → {chunks_total} chunks")
    progress_callback(5, f"✓ File scanned: {total_rows:,} rows, {chunks_total} chunks")

    # --- Load chunks ---
    reader = _get_reader(file_path, ext, chunksize)
    processed_chunks: List[pd.DataFrame] = []
    chunk_idx = 0
    missing_filled_total = 0

    for chunk in reader:
        chunk_idx += 1
        pct = int(5 + (chunk_idx / chunks_total) * 75)
        progress_callback(pct, f"⟳ Processing chunk {chunk_idx}/{chunks_total}...")

        # Per-chunk cleaning
        chunk, chunk_missing = _clean_chunk(chunk, config)
        missing_filled_total += chunk_missing
        processed_chunks.append(chunk)
        log.append(f"✓ Chunk {chunk_idx}/{chunks_total}: {len(chunk):,} rows processed")

    stats["missing_filled"] = missing_filled_total

    progress_callback(82, "⟳ Concatenating chunks...")
    log.append("⟳ Concatenating all chunks...")
    df = pd.concat(processed_chunks, ignore_index=True)

    # Global dedup pass
    if config.get("remove_duplicates"):
        before_dedup = len(df)
        df = df.drop_duplicates()
        stats["duplicates_removed"] = before_dedup - len(df)
        log.append(f"✓ Global dedup: removed {stats['duplicates_removed']:,} duplicates")
        progress_callback(88, f"✓ Removed {stats['duplicates_removed']:,} duplicates globally")

    # Global outlier removal
    if config.get("remove_outliers"):
        before_out = len(df)
        num_cols = df.select_dtypes(include=[np.number]).columns
        mask = pd.Series([True] * len(df), index=df.index)
        for col in num_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 3 * IQR
            upper = Q3 + 3 * IQR
            mask = mask & (df[col].between(lower, upper) | df[col].isna())
        df = df[mask]
        stats["outliers_removed"] = before_out - len(df)
        log.append(f"✓ Removed {stats['outliers_removed']:,} outlier rows (global, 3×IQR)")
        progress_callback(94, f"✓ Outlier removal complete")

    stats["rows_after"] = len(df)
    stats["rows_removed"] = stats["rows_before"] - stats["rows_after"]
    log.append(f"✓ Final dataset: {stats['rows_after']:,} rows")
    progress_callback(98, "✓ Cleaning complete — saving output...")

    return {"df": df, "stats": stats, "log": log}


def _clean_chunk(chunk: pd.DataFrame, config: Dict[str, bool]):
    missing_filled = 0

    if config.get("handle_missing"):
        chunk = chunk.dropna(how="all")
        num_cols = chunk.select_dtypes(include=[np.number]).columns
        for col in num_cols:
            col_mean = chunk[col].mean()
            if pd.isna(col_mean):
                col_mean = 0
            null_count = chunk[col].isnull().sum()
            if null_count > 0:
                chunk[col] = chunk[col].fillna(col_mean)
                missing_filled += int(null_count)
        text_cols = chunk.select_dtypes(include=["object", "string"]).columns
        for col in text_cols:
            mode_vals = chunk[col].mode()
            fill_val = mode_vals.iloc[0] if len(mode_vals) > 0 else ""
            null_count = chunk[col].isnull().sum()
            if null_count > 0:
                chunk[col] = chunk[col].fillna(fill_val)
                missing_filled += int(null_count)

    if config.get("fix_dtypes"):
        for col in chunk.select_dtypes(include=["object"]).columns:
            converted_col = pd.to_numeric(chunk[col], errors="coerce")
            non_null_orig = chunk[col].notna().sum()
            non_null_conv = converted_col.notna().sum()
            if non_null_orig > 0 and non_null_conv / non_null_orig > 0.7:
                chunk[col] = converted_col

    if config.get("normalize_text"):
        text_cols = chunk.select_dtypes(include=["object"]).columns
        for col in text_cols:
            chunk[col] = chunk[col].apply(
                lambda x: x.strip().lower() if isinstance(x, str) else x
            )

    if config.get("fix_formatting"):
        text_cols = chunk.select_dtypes(include=["object"]).columns
        for col in text_cols:
            col_lower = col.lower()
            if any(kw in col_lower for kw in ["email", "mail"]):
                chunk[col] = chunk[col].apply(
                    lambda x: x.lower().strip() if isinstance(x, str) else x
                )
            elif any(kw in col_lower for kw in ["phone", "tel", "mobile", "contact"]):
                chunk[col] = chunk[col].apply(_clean_phone)
            elif any(kw in col_lower for kw in ["date", "time", "dob", "birth", "created", "updated"]):
                try:
                    chunk[col] = pd.to_datetime(chunk[col], errors="coerce").dt.strftime("%Y-%m-%d")
                except Exception:
                    pass
            elif any(kw in col_lower for kw in ["name", "first", "last", "full"]):
                chunk[col] = chunk[col].apply(
                    lambda x: x.title() if isinstance(x, str) else x
                )

    return chunk, missing_filled


def _clean_phone(val):
    if not isinstance(val, str):
        return val
    digits = re.sub(r"\D", "", val)
    return digits if digits else val


def _count_rows(file_path: Path, ext: str) -> int:
    try:
        if ext in (".csv", ".tsv"):
            sep = "\t" if ext == ".tsv" else ","
            count = sum(1 for _ in open(file_path, encoding="utf-8", errors="replace")) - 1
            return max(count, 0)
        else:
            df = pd.read_json(file_path)
            return len(df)
    except Exception:
        return 0


def _get_reader(file_path: Path, ext: str, chunksize: int):
    if ext == ".csv":
        return pd.read_csv(file_path, chunksize=chunksize, low_memory=False)
    elif ext == ".tsv":
        return pd.read_csv(file_path, sep="\t", chunksize=chunksize, low_memory=False)
    elif ext == ".json":
        # JSON doesn't support chunked reading natively; load in one shot
        df = pd.read_json(file_path)
        return [df[i:i+chunksize] for i in range(0, len(df), chunksize)]
    else:
        raise ValueError(f"Unsupported extension: {ext}")
