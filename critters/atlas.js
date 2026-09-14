// UV map for the approved cropped sprite atlas.
export const ATLAS_URL=new URL('./atlas.png',import.meta.url).href;
export const SPRITES=Object.freeze({"low_frog_f":[0.0,0.0,0.125,0.25],"low_frog_b":[0.125,0.0,0.25,0.25],"low_bug_f":[0.25,0.0,0.375,0.25],"low_bug_b":[0.375,0.0,0.5,0.25],"low_rabbit_f":[0.5,0.0,0.625,0.25],"low_rabbit_b":[0.625,0.0,0.75,0.25],"mid_bird_f":[0.75,0.0,0.875,0.25],"mid_bird_b":[0.875,0.0,1.0,0.25],"mid_squirrel_f":[0.0,0.25,0.125,0.5],"mid_squirrel_b":[0.125,0.25,0.25,0.5],"mid_hedgehog_f":[0.25,0.25,0.375,0.5],"mid_hedgehog_b":[0.375,0.25,0.5,0.5],"high_fawn_f":[0.5,0.25,0.625,0.5],"high_fawn_b":[0.625,0.25,0.75,0.5],"high_turtle_f":[0.75,0.25,0.875,0.5],"high_turtle_b":[0.875,0.25,1.0,0.5],"high_panda_f":[0.0,0.5,0.125,0.75],"high_panda_b":[0.125,0.5,0.25,0.75],"panda_roll3":[0.25,0.5,0.375,0.75],"magnet_f":[0.375,0.5,0.5,0.75],"magnet_b":[0.5,0.5,0.625,0.75],"nova_f":[0.625,0.5,0.75,0.75],"nova_b":[0.75,0.5,0.875,0.75],"heal_f":[0.875,0.5,1.0,0.75],"heal_b":[0.0,0.75,0.125,1.0]});
export const EXP_FRAMES=Object.freeze([
  Object.freeze([Object.freeze(['low_frog_f','low_frog_b']),Object.freeze(['low_bug_f','low_bug_b']),Object.freeze(['low_rabbit_f','low_rabbit_b'])]),
  Object.freeze([Object.freeze(['mid_bird_f','mid_bird_b']),Object.freeze(['mid_squirrel_f','mid_squirrel_b']),Object.freeze(['mid_hedgehog_f','mid_hedgehog_b'])]),
  Object.freeze([Object.freeze(['high_fawn_f','high_fawn_b']),Object.freeze(['high_turtle_f','high_turtle_b']),Object.freeze(['high_panda_f','high_panda_b'])])
]);
export const PANDA_ROLL='panda_roll3';
export const ITEM_FRAMES=Object.freeze({
  magnet:Object.freeze(['magnet_f','magnet_b']),
  nova:Object.freeze(['nova_f','nova_b']),
  heal:Object.freeze(['heal_f','heal_b'])
});
