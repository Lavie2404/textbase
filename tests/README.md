# Test Infrastructure

**Engine**: Godot 4.6
**Test Framework**: GUT (Godot Unit Test) v9.7.1 — `addons/gut/`
**CI**: `.github/workflows/tests.yml`
**Setup date**: 2026-08-12

> Note: this project uses **GUT**, not GdUnit4. `technical-preferences.md`
> §Testing pins `Framework: GUT`, and the existing combat test suite
> (`tests/unit/combat/*.gd`) already uses `extends GutTest`. Any tooling
> or CI step added later must target GUT's CLI, not GdUnit4's.

## Directory Layout

```
tests/
  unit/           # Isolated unit tests (formulas, state machines, logic)
    combat/       # Combat System — D.4/D.5/D.6, AC-18..22/51 etc.
  integration/    # Cross-system and save/load tests
  smoke/          # Critical path test list for /smoke-check gate
  evidence/       # Screenshot logs and manual test sign-off records
```

## Running Tests

From the project root (where `project.godot` lives):

```bash
# Run everything under tests/
godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests -gexit

# Run one subsystem only
godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit/combat -gexit

# Run a single file
godot --headless -s addons/gut/gut_cmdln.gd -gtest=res://tests/unit/combat/combat_damage_test.gd -gexit
```

`-gexit` makes Godot quit with a non-zero exit code on any test failure —
this is what CI relies on for a pass/fail gate.

From the editor: open the **GUT** bottom panel (installed at
`addons/gut/`) and run tests interactively.

## Test Naming

- **Files**: `[system]_[feature]_test.gd`
- **Functions**: `test_[system]_[scenario]_[expected_result]` (see
  `.claude/rules/test-standards.md`)
- **Example**: `combat_damage_test.gd` → `test_raw_damage_chip_floor_replaces_zero_on_wall_punch()`
- Test classes `extends GutTest`; shared fixtures go in a `*_test_factory.gd`
  helper in the same subdirectory (see `tests/unit/combat/combat_test_factory.gd`).

## Story Type → Test Evidence

| Story Type | Required Evidence | Location |
|---|---|---|
| Logic | Automated unit test — must pass | `tests/unit/[system]/` |
| Integration | Integration test OR playtest doc | `tests/integration/[system]/` |
| Visual/Feel | Screenshot + lead sign-off | `tests/evidence/` |
| UI | Manual walkthrough OR interaction test | `tests/evidence/` |
| Config/Data | Smoke check pass | `production/qa/smoke-*.md` |

## CI

Tests run automatically on every push to `main` and on every pull request.
A failed test suite blocks merging. See `.github/workflows/tests.yml` —
it downloads a headless Godot 4.6 build and invokes GUT's CLI runner
(`addons/gut/gut_cmdln.gd`) directly, since there is no widely maintained
GitHub Action for GUT (unlike GdUnit4's `MikeSchulze/gdUnit4-action`).
