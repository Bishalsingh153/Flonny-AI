#!/usr/bin/env python3
"""Train a TF-IDF + Logistic Regression category classifier for Floony NL parse."""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

HERE = Path(__file__).resolve().parent
DATA_PATH = HERE / "data" / "transactions_labeled.csv"
MODEL_DIR = HERE / "model"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"
MODEL_PATH = MODEL_DIR / "model.pkl"

# CSV may use short labels. Map onto Floony's transaction.category values.
SHORT_TO_FLOONY = {
    "Food": "Food & Dining",
    "Transport": "Transportation",
    "Entertainment": "Entertainment",
    "Bills": "Utilities",
    "Shopping": "Shopping",
    "Income": "Salary",
    "Other": "Other",
}

FLOONY_CATEGORIES = {
    "Food & Dining",
    "Transportation",
    "Fuel",
    "Shopping",
    "Entertainment",
    "Utilities",
    "Rent",
    "Healthcare",
    "Education",
    "Subscriptions",
    "Transfers",
    "Salary",
    "Freelance",
    "Other",
}


def map_category(description: str, category: str) -> str:
    raw = str(category or "").strip()
    text = str(description or "").lower()

    if raw in FLOONY_CATEGORIES:
        return raw

    if raw == "Bills" and "rent" in text:
        return "Rent"
    if raw == "Income":
        if any(k in text for k in ("freelance", "upwork", "consulting", "writing", "design project")):
            return "Freelance"
        return "Salary"

    return SHORT_TO_FLOONY.get(raw, "Other")


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        print(f"Labeled CSV not found: {path}", file=sys.stderr)
        print("Place description,category rows at backend/ml/data/transactions_labeled.csv", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(path)
    if "description" not in df.columns or "category" not in df.columns:
        print("CSV must have description and category columns.", file=sys.stderr)
        sys.exit(1)

    df = df.dropna(subset=["description", "category"]).copy()
    df["description"] = df["description"].astype(str).str.strip()
    df = df[df["description"] != ""]
    df["category"] = [
        map_category(desc, cat) for desc, cat in zip(df["description"], df["category"])
    ]
    if df.empty:
        print("No labeled rows after cleaning.", file=sys.stderr)
        sys.exit(1)
    return df


def main() -> None:
    df = load_dataset(DATA_PATH)
    X = df["description"]
    y = df["category"]
    counts = Counter(y)
    print(f"Rows: {len(df)}")
    print("Class counts:", dict(sorted(counts.items())))

    stratify = y if min(counts.values()) >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        min_df=1,
        max_features=8000,
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(
        max_iter=1000,
        C=12,
        solver="lbfgs",
    )
    model.fit(X_train_vec, y_train)

    y_pred = model.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {acc:.4f}")
    print("\nPer-class precision / recall:")
    print(classification_report(y_test, y_pred, zero_division=0))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    joblib.dump(model, MODEL_PATH)
    print(f"Saved {VECTORIZER_PATH}")
    print(f"Saved {MODEL_PATH}")


if __name__ == "__main__":
    main()
