# CROPOCTOR ML Pipeline

This directory contains the reproducible data pipeline and model training/evaluation scripts for the crop disease classifier.

## Strategy
1. **Public Datasets:** Uses PlantVillage and PlantDoc (field conditions).
2. **Taxonomy & Mapping:** Maps dataset-specific labels into canonical CROPOCTOR `diagnosisCode`s to prevent leakage or confusion.
3. **Reproducibility:** Group-aware splits to ensure images from the same plant/leaf do not leak between train and test sets.
4. **Evaluation:** Computes metrics (Brier score for calibration, macro F1, confusion matrices) on a held-out test set (PlantDoc) which represents real-world data.

## Scripts Overview
- \`download_plantvillage.py\`: Fetches PlantVillage and preserves license/citation metadata.
- \`download_plantdoc.py\`: Fetches PlantDoc dataset.
- \`prepare_dataset.py\`: Normalizes labels using \`taxonomy/mappings.json\`.
- \`split_dataset.py\`: Performs group-aware train/val/test splits.
- \`evaluate_model.py\`: Benchmarks model calibration and generates \`reports/confusion_matrix.png\`.

## License Safety
Do NOT redistribute these datasets inside the CROPOCTOR Git repository unless their license permits it. The datasets are ignored via \`.gitignore\`.
