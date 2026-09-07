# Containers

## Metal

- mini - 19g
- small - 276g
- medium - 378g
- large - 492g
- extra large - 620g
- ice cream tray - 750g

## Plastic

- small - 263g
- large - 393g

## Deco container

- basket - 600g

## Default containers

A product can have a container pre-selected so staff don't pick it every time.
Set in `config/products.json` as `defaultContainer` (a container id from
`config/containers.json`):

- on a **group** — applies to every weighed product in it;
- on a **product** — overrides the group's.

Staff can always switch to another container; the default only decides what's
selected when the row opens. Counted products can't have one.

Set today:

- Ice cream (whole group) → **ice cream tray** (750g)

Fresh and frozen fruit have no default yet — if a fruit is always weighed in
the same tray, add it the same way.
