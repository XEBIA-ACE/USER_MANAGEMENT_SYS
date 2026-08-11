# User_Management — Administrator Role (US-001)

This package implements the **Administrator** role for the `User_Management`
application as specified in `specs/us-001/`.

---

## Files

| Path | Purpose |
|------|---------|
| `src/administrator_role.py` | Role definition, permission catalogue, guard utilities |
| `tests/test_administrator_role.py` | Unit tests (≥ 85 % coverage target per constitution.md) |
| `docs/administrator_role_analysis.md` | Research & analysis document (US-001 acceptance criteria) |

---

## Quick start

```bash
pip install pytest
pytest tests/test_administrator_role.py -v
```

---

## Permission model

All permissions follow the `<resource>:<action>` pattern and are defined as
the `Permission` enum in `src/administrator_role.py`.  The Administrator role
is granted every permission in the catalogue; the Regular User role starts
with none (default-deny / least-privilege).

See `docs/administrator_role_analysis.md` for the full analysis including
compliance mapping and open questions.
