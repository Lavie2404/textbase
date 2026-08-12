# Godot UI — Quick Reference

Last verified: 2026-08-12 (recursive-disable section: live ClassDB + runtime
verification against the pinned 4.6.stable binary; rest of file: 2026-02-12) |
Engine: Godot 4.6

## What Changed Since ~4.3 (LLM Cutoff)

### 4.6 Changes
- **Dual-focus system**: Mouse/touch focus is now SEPARATE from keyboard/gamepad focus
  - Visual feedback differs by input method
  - Custom focus implementations may need updating
- **TabContainer**: Tab properties editable directly in Inspector
- **TileMapLayer scene tile rotation**: Scene tiles can be rotated like atlas tiles

### 4.5 Changes
- **FoldableContainer**: New accordion-style UI node for collapsible sections
- **Recursive Control behavior**: Disable mouse/focus for entire node hierarchies —
  **TWO separate properties, not one** (corrected 2026-08-12 after this entry was
  found stale/wrong during `/architecture-decision` for
  `docs/architecture/adr-0007-core-ui-input-lock-screen-stack-safe-area.md`; verified
  directly against the pinned 4.6.stable binary via `ClassDB.class_get_property_list`
  and a runtime instantiation test, not training data — see Current API Patterns
  below): `mouse_behavior_recursive` and `focus_behavior_recursive`, independent of
  each other. Setting only one leaves the other channel (mouse OR keyboard/gamepad
  focus) completely unaffected by the ancestor's lock.
- **Screen reader support**: Control nodes work with AccessKit — **confirmed
  native-desktop-only, non-functional on Web/HTML5 export** (this project's sole
  target platform) — see `docs/architecture/adr-0006-tap-name-to-card-entry-point.md`
  Part 2 for the accessibility-scope decision this forced.
- **Live translation preview**: Test different locales in-editor
- **`RichTextLabel.push_meta`**: Added optional `tooltip` parameter (from 4.4)

### 4.4 Changes
- **`GraphEdit.connect_node`**: Added optional `keep_alive` parameter

## Current API Patterns

### Theme and Style (4.6)
```gdscript
# Editor uses new "Modern" theme by default
# For game UI, use custom themes as before:
var theme := Theme.new()
theme.set_color(&"font_color", &"Label", Color.WHITE)
theme.set_font_size(&"font_size", &"Label", 24)
```

### Focus Management (4.6 — CHANGED)
```gdscript
# Keyboard/gamepad focus (grab_focus still works)
func _ready() -> void:
    %StartButton.grab_focus()

# IMPORTANT: In 4.6, mouse hover is separate from keyboard focus
# Both can be active simultaneously on different controls
# Test your UI with BOTH mouse and keyboard/gamepad

# Focus neighbors (unchanged)
%Button1.focus_neighbor_bottom = %Button2.get_path()
%Button1.focus_neighbor_right = %Button3.get_path()
```

### FoldableContainer (4.5 — NEW)
```gdscript
# Accordion-style collapsible container
# Add as parent of content you want to make collapsible
# Children show/hide when header is clicked
# Configure via editor properties or code
```

### Recursive Disable (4.5 — NEW, corrected 2026-08-12)
```gdscript
# TWO separate properties on Control, each its own 3-state enum
# (Inherited=0 / Disabled=1 / Enabled=2) — verified against the pinned 4.6.stable
# binary via ClassDB.class_get_property_list("Control", true) and a runtime
# instantiation test (not from training data, which predates this API):
#
#   mouse_behavior_recursive: Control.MOUSE_BEHAVIOR_INHERITED/DISABLED/ENABLED
#   focus_behavior_recursive: Control.FOCUS_BEHAVIOR_INHERITED/DISABLED/ENABLED
#
# MUST set BOTH to actually lock a subtree against all input — setting only one
# leaves the other channel (mouse/touch OR keyboard/gamepad focus) completely
# unaffected. This is NOT the older mouse_filter property (still exists,
# per-node, non-recursive, unrelated mechanism):
%InputArea.mouse_behavior_recursive = Control.MOUSE_BEHAVIOR_DISABLED
%InputArea.focus_behavior_recursive = Control.FOCUS_BEHAVIOR_DISABLED

# To verify the EFFECTIVE (post-override) state of a descendant for a test —
# reading the descendant's own mouse_filter/focus_mode property does NOT
# reflect an ancestor's recursive override; use the *_with_override() query
# methods instead (confirmed to return the overridden value, not the raw one):
%SomeChild.get_mouse_filter_with_override()   # -> Control.MOUSE_FILTER_IGNORE
%SomeChild.get_focus_mode_with_override()     # -> Control.FOCUS_NONE
```

### Localization-Ready UI (best practice)
```gdscript
# Use tr() for all visible strings
label.text = tr("MENU_START_GAME")

# Use auto-wrap for labels (text length varies by language)
label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

# Test with live translation preview in editor (4.5+)
```

## Common Mistakes
- Assuming `grab_focus()` affects mouse focus (keyboard/gamepad only in 4.6)
- Not testing UI with both mouse and gamepad after upgrading to 4.6
- Hardcoding strings instead of using `tr()` for localization
- Not using `FoldableContainer` for collapsible UI (new in 4.5, cleaner than custom)
- **Setting only `mouse_behavior_recursive` (or only `focus_behavior_recursive`)
  when the intent is to lock a subtree against ALL input** — the two properties
  are fully independent; setting just one leaves keyboard/gamepad (or mouse/touch)
  navigation able to bypass the lock entirely. Found the hard way during this
  project's `/architecture-decision` for input-lock (`adr-0007`) — the project's
  own earlier docs here only documented `mouse_filter`, never mentioned either
  `*_behavior_recursive` property existed.
- Reading a descendant's raw `mouse_filter`/`focus_mode` property to check
  whether it's *effectively* locked by an ancestor's recursive setting — the raw
  property does not change; use `get_mouse_filter_with_override()` /
  `get_focus_mode_with_override()` instead.
