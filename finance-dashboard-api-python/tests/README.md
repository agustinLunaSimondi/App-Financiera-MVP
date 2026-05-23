# Tests — finance-dashboard-api-python

## Estructura

- `legacy_*.py` — scripts manuales heredados. No siguen convención pytest, no se ejecutan en CI.
- `manual_qa_*.py` — scripts de QA manual contra entorno real. Requieren backend levantado.
- `test_*.py` (nuevos) — suite pytest ejecutable con `pytest tests/`.

## Correr

```bash
cd finance-dashboard-api-python
.\venv\Scripts\activate  # Windows
pytest tests/ -v
```

## TODO

Migrar los `legacy_*` a fixtures pytest cuando se sume CI.
