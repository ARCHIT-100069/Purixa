import re
import pandas as pd
import numpy as np
from typing import Dict, Any


def clean_dataframe(df: pd.DataFrame, config: Dict[str, bool]) -> Dict[str, Any]:
    """
    Run all enabled cleaning operations on a DataFrame in-memory.
    Returns dict with cleaned df and stats.
    """
    stats = {
        "rows_before": len(df),
        "rows_after": 0,
        "duplicates_removed": 0,
        "missing_filled": 0,
        "outliers_removed": 0,
        "rows_removed": 0,
    }
    log = []

    # 1. Remove duplicates
    if config.get("remove_duplicates"):
        before = len(df)
        df = df.drop_duplicates()
        removed = before - len(df)
        stats["duplicates_removed"] = removed
        log.append(f"✓ Removed {removed} duplicate rows")

    # 2. Handle missing values
    if config.get("handle_missing"):
        before_missing = int(df.isnull().sum().sum())
        # Drop fully empty rows
        df = df.dropna(how="all")
        # Fill numeric columns with mean
        num_cols = df.select_dtypes(include=[np.number]).columns
        for col in num_cols:
            col_mean = df[col].mean()
            if pd.isna(col_mean):
                col_mean = 0
            null_count = df[col].isnull().sum()
            if null_count > 0:
                df[col] = df[col].fillna(col_mean)
                stats["missing_filled"] += int(null_count)
        # Fill text columns with mode
        text_cols = df.select_dtypes(include=["object", "string"]).columns
        for col in text_cols:
            mode_vals = df[col].mode()
            fill_val = mode_vals.iloc[0] if len(mode_vals) > 0 else ""
            null_count = df[col].isnull().sum()
            if null_count > 0:
                df[col] = df[col].fillna(fill_val)
                stats["missing_filled"] += int(null_count)
        after_missing = int(df.isnull().sum().sum())
        log.append(f"✓ Filled {stats['missing_filled']} missing values")

    # 3. Fix data types
    if config.get("fix_dtypes"):
        converted = 0
        for col in df.select_dtypes(include=["object"]).columns:
            converted_col = pd.to_numeric(df[col], errors="coerce")
            non_null_original = df[col].notna().sum()
            non_null_converted = converted_col.notna().sum()
            # Only convert if most values successfully convert (>70%)
            if non_null_original > 0 and non_null_converted / non_null_original > 0.7:
                df[col] = converted_col
                converted += 1
        log.append(f"✓ Detected and converted {converted} columns to numeric types")

    # 4. Normalize / standardize text
    if config.get("normalize_text"):
        text_cols = df.select_dtypes(include=["object"]).columns
        for col in text_cols:
            df[col] = df[col].apply(lambda x: x.strip().lower() if isinstance(x, str) else x)
        log.append(f"✓ Normalized text in {len(text_cols)} columns (trimmed & lowercased)")

    # 5. Remove outliers (IQR method, 3× IQR fence)
    if config.get("remove_outliers"):
        before = len(df)
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
        removed = before - len(df)
        stats["outliers_removed"] = removed
        log.append(f"✓ Removed {removed} outlier rows (3×IQR method)")

    # 6. Fix formatting
    if config.get("fix_formatting"):
        fixes = 0
        text_cols = df.select_dtypes(include=["object"]).columns
        for col in text_cols:
            col_lower = col.lower()
            if any(kw in col_lower for kw in ["email", "mail"]):
                df[col] = df[col].apply(lambda x: x.lower().strip() if isinstance(x, str) else x)
                fixes += 1
            elif any(kw in col_lower for kw in ["phone", "tel", "mobile", "contact"]):
                df[col] = df[col].apply(_clean_phone)
                fixes += 1
            elif any(kw in col_lower for kw in ["date", "time", "dob", "birth", "created", "updated"]):
                try:
                    df[col] = pd.to_datetime(df[col], errors="coerce").dt.strftime("%Y-%m-%d")
                except Exception:
                    pass
                fixes += 1
            elif any(kw in col_lower for kw in ["name", "first", "last", "full"]):
                df[col] = df[col].apply(lambda x: x.title() if isinstance(x, str) else x)
                fixes += 1
        log.append(f"✓ Fixed formatting in {fixes} columns (emails, phones, dates, names)")

    stats["rows_after"] = len(df)
    stats["rows_removed"] = stats["rows_before"] - stats["rows_after"]

    return {"df": df, "stats": stats, "log": log}


def _clean_phone(val):
    if not isinstance(val, str):
        return val
    digits = re.sub(r"\D", "", val)
    return digits if digits else val
