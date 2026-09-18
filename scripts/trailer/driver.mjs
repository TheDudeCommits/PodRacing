/**
 * The in-page hero driver, injected into the built bundle for trailer capture.
 *
 * v1 of this trailer held `setInput({throttle:1})` with no steering, so the pod
 * drove straight off the racing line while the camera followed it into open
 * desert. This is a closed-loop replacement: a PD lane-hold on the review
 * snapshot's `lateralOffset` (kp/kd tuned to a 3.5 m median, zero off-course
 * resets), plus drafting, overtaking, lance fire at real targets and shield
 * reactions to real incoming projectiles.
 *
 * It also fixes the staging: seekCourse puts the hero ahead of the whole field,
 * so a chase camera sees nothing. `yieldFor` runs a slow phase first and lets
 * the seven rivals stream past, putting the hero in traffic before the take.
 */
export const DRIVER_SOURCE = `
window.__TRAILER_DRIVE__ = (function () {
  var prevLat = null, fireCooldown = 0, shieldCooldown = 0, weaveT = 0;
  var KP = 0.055, KD = 0.115, DT = 2 / 120;

  function forwardOf(yaw) { return { x: Math.sin(yaw), z: Math.cos(yaw) }; }

  return function drive(cmd) {
    cmd = cmd || {};
    var api = window.__PODRACING__;
    var snap = api.snapshot();
    var racers = snap.galactic.racers;
    var me = racers.find(function (r) { return r.id === 'player'; });
    if (!me) return null;

    var lat = me.lateralOffset, yaw = me.yaw || 0, pos = me.position || [0, 0, 0];
    var rivals = racers.filter(function (r) { return r.id !== 'player' && r.position; });
    var fwd = forwardOf(yaw);

    // Where on the track this shot wants the hero to sit. A slow weave keeps a
    // dead-centre line from reading robotic.
    weaveT += DT;
    var target = (cmd.targetLat || 0) + Math.sin(weaveT * 0.55) * (cmd.weave === 0 ? 0 : (cmd.weave || 2.2));

    // Overtaking: if a rival sits close ahead, pick the free side and go round.
    var ahead = null, aheadDist = 1e9;
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      var dx = r.position[0] - pos[0], dz = r.position[2] - pos[2];
      var along = dx * fwd.x + dz * fwd.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (along > 4 && dist < aheadDist) { aheadDist = dist; ahead = r; }
    }
    if (cmd.overtake !== false && ahead && aheadDist < 95) {
      var gap = ahead.lateralOffset - lat;
      target = ahead.lateralOffset + (gap >= 0 ? -13 : 13);
    }

    var d = prevLat === null ? 0 : (lat - prevLat) / DT;
    prevLat = lat;
    var steer = -(KP * (lat - target)) - (KD * d);
    steer = Math.max(-1, Math.min(1, steer));

    // Lance: fire only at a rival actually inside the forward cone, and pulse
    // the trigger, because the weapon fires on the press.
    var fire = false;
    fireCooldown = Math.max(0, fireCooldown - DT);
    if (cmd.fire && fireCooldown === 0 && ahead && aheadDist < 230) {
      var ax = ahead.position[0] - pos[0], az = ahead.position[2] - pos[2];
      var alen = Math.sqrt(ax * ax + az * az) || 1;
      if ((ax / alen) * fwd.x + (az / alen) * fwd.z > 0.982) { fire = true; fireCooldown = 0.55; }
    }

    // Shield: react to a real incoming bolt, not a timer.
    var shield = false;
    shieldCooldown = Math.max(0, shieldCooldown - DT);
    var projectiles = (snap.galactic.world && snap.galactic.world.projectiles) || [];
    if (cmd.shield !== false && shieldCooldown === 0) {
      for (var p = 0; p < projectiles.length; p++) {
        var pr = projectiles[p];
        if (pr.ownerId === 'player') continue;
        var px = pr.position.x - pos[0], pz = pr.position.z - pos[2];
        if (Math.sqrt(px * px + pz * pz) < 110) { shield = true; shieldCooldown = 2.2; break; }
      }
    }

    var straight = Math.abs(steer) < 0.18;
    var input = {
      throttle: cmd.throttle === undefined ? 1 : cmd.throttle,
      steer: steer,
      drift: cmd.drift === false ? false : Math.abs(steer) > 0.46,
      boost: cmd.boost === false ? false : (straight && (me.galactic.boost ? me.galactic.boost.energy > 0.3 : true)),
      fire: fire,
      shield: shield,
      mine: !!cmd.mine
    };
    api.setInput(input);
    return { lat: lat, target: target, steer: steer, aheadDist: ahead ? aheadDist : null, fire: fire, shield: shield };
  };
})();
`;
