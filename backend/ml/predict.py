#!/usr/bin/env python3
"""Predict a Floony transaction category from description/merchant text."""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
VECTORIZER_PATH = HERE / "model" / "vectorizer.pkl"
MODEL_PATH = HERE / "model" / "model.pkl"

_vectorizer = None
_model = None


def fail(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    sys.exit(code)


def load_model():
    global _vectorizer, _model
    if _vectorizer is not None and _model is not None:
        return _vectorizer, _model
    if not VECTORIZER_PATH.exists() or not MODEL_PATH.exists():
        fail(
            "Classifier model files not found. "
            "Run: python3 backend/ml/train_classifier.py"
        )
    try:
        import joblib
    except ImportError:
        fail("Missing joblib. Install backend/ml/requirements.txt")
    _vectorizer = joblib.load(VECTORIZER_PATH)
    _model = joblib.load(MODEL_PATH)
    return _vectorizer, _model


def predict_text(text: str) -> dict:
    vectorizer, model = load_model()
    vec = vectorizer.transform([text])
    category = str(model.predict(vec)[0])
    confidence = 0.0
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(vec)[0]
        classes = list(model.classes_)
        confidence = float(proba[classes.index(category)])
    return {"category": category, "confidence": round(confidence, 4)}


def serve() -> None:
    load_model()
    print(json.dumps({"ok": True, "ready": True}), flush=True)
    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            print(json.dumps({"error": "invalid json"}), flush=True)
            continue
        if req.get("ping"):
            print(json.dumps({"ok": True}), flush=True)
            continue
        text = str(req.get("text") or "").strip()
        if not text:
            print(json.dumps({"error": "missing text"}), flush=True)
            continue
        print(json.dumps(predict_text(text)), flush=True)


def main() -> None:
    if len(sys.argv) >= 2 and sys.argv[1] == "--serve":
        serve()
        return
    if len(sys.argv) < 2 or not str(sys.argv[1]).strip():
        fail("Usage: predict.py <description text>")
    print(json.dumps(predict_text(str(sys.argv[1]).strip())))


if __name__ == "__main__":
    main()
