# Owner-approved Spark Hedgehog art

`approved-run.jpg`, `approved-attack.jpg`, `approved-hurt.png`, `approved-death.png` are the owner's final four uploads. The matching original transparent Run/Attack PNGs are retained as alpha sources, not new artwork. Their identity was checked against the JPEG versions before slicing. No generated replacement poses are used.

`tools/prepare-spark-assets.py` produces the atlas from these files; source hashes and per-cell transforms/color correction are recorded in `game/assets/enemies/spark-hedgehog-atlas.json`. Body sizing excludes the floating stars/spirit/electricity. Hurt is mirrored once in the output to align native facing with Run; Death retains its supplied geometry.
