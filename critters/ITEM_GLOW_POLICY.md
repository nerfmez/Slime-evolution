# Item glow policy

Heal, Magnet and Nova animal sprite pixels must stay clean: no baked aura cloud, glow, sparkles, coins, petals, hearts or other VFX around the animal. Their original body colors and shading are preserved.

The visible pink / cyan / gold glow is generated at runtime in `critters/renderer.js` only. EXP animals do not receive this glow.
