/**
 * The in-page hero driver, injected into the built bundle for trailer capture.
 *
 * v1 held setInput({throttle:1}) with no steering and drove off the course. v2
 * added a PD lane hold but still wandered: the overtake bias chased rivals that
 * were themselves wide (one take peaked 117 m off the centreline), and drifting
 * pushed the hero out with no recovery. This version clamps every target to the
 * racing surface and adds an explicit recentre state.
 *
 * It also emits per-frame telemetry so cuts can be chosen from measured data
 * (on the line, rivals close, weapon actually firing) instead of by eye.
 */
export const DRIVER_SOURCE = `
window.__TRAILER_DRIVE__ = (function () {
  var prevLat = null, fireCooldown = 0, shieldCooldown = 0, weaveT = 0;
  var recovering = false, prevShots = 0, prevMines = 0;
  var KP = 0.055, KD = 0.115, DT = 2 / 120;
  var HALF = 9;          // keep every commanded line inside the racing surface
  var RECOVER_IN = 11;   // beyond this the take is off-track: recentre hard
  var RECOVER_OUT = 5;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  return function drive(cmd) {
    cmd = cmd || {};
    var api = window.__PODRACING__;
    var snap = api.snapshot();
    var racers = snap.galactic.racers;
    var me = racers.find(function (r) { return r.id === 'player'; });
    if (!me) return null;

    var g = me.galactic;
    var lat = me.lateralOffset, yaw = me.yaw || 0, pos = me.position || [0, 0, 0];
    var fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
    var rivals = racers.filter(function (r) { return r.id !== 'player' && r.position; });

    // Off-track recovery takes priority over everything the shot asked for.
    if (Math.abs(lat) > RECOVER_IN) recovering = true;
    else if (Math.abs(lat) < RECOVER_OUT) recovering = false;

    weaveT += DT;
    var target = clamp(cmd.targetLat || 0, -HALF, HALF);
    if (!recovering && cmd.weave !== 0) target += Math.sin(weaveT * 0.55) * (cmd.weave || 2.0);

    // Nearest rival ahead, used for both overtaking and the lance cone.
    var ahead = null, aheadDist = 1e9, near = 0;
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      var dx = r.position[0] - pos[0], dz = r.position[2] - pos[2];
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 90) near++;
      if (dx * fwd.x + dz * fwd.z > 4 && dist < aheadDist) { aheadDist = dist; ahead = r; }
    }
    if (!recovering && cmd.overtake !== false && ahead && aheadDist < 95) {
      var gap = ahead.lateralOffset - lat;
      target = ahead.lateralOffset + (gap >= 0 ? -12 : 12);
    }
    target = clamp(recovering ? 0 : target, -HALF, HALF);

    var d = prevLat === null ? 0 : (lat - prevLat) / DT;
    prevLat = lat;
    var steer = clamp(-(KP * (lat - target)) - (KD * d), -1, 1);

    var fire = false;
    fireCooldown = Math.max(0, fireCooldown - DT);
    if (cmd.fire && fireCooldown === 0 && ahead && aheadDist < 300) {
      var ax = ahead.position[0] - pos[0], az = ahead.position[2] - pos[2];
      var al = Math.sqrt(ax * ax + az * az) || 1;
      if ((ax / al) * fwd.x + (az / al) * fwd.z > 0.945) { fire = true; fireCooldown = 0.42; }
    }

    var shield = false;
    shieldCooldown = Math.max(0, shieldCooldown - DT);
    var projectiles = (snap.galactic.world && snap.galactic.world.projectiles) || [];
    var incoming = 0;
    for (var p = 0; p < projectiles.length; p++) {
      var pr = projectiles[p];
      if (pr.ownerId === 'player') continue;
      var px = pr.position.x - pos[0], pz = pr.position.z - pos[2];
      if (Math.sqrt(px * px + pz * pz) < 130) incoming++;
    }
    if (cmd.shield !== false && shieldCooldown === 0 && (incoming > 0 || cmd.forceShield)) {
      shield = true; shieldCooldown = 2.0;
    }

    // Drift only in a real corner and only while still on the surface, so the
    // slide showcases handling instead of leaving the track.
    var wantDrift = cmd.drift === false ? false
      : (cmd.drift === true ? true : (Math.abs(steer) > 0.5 && Math.abs(lat) < 10));
    if (recovering) wantDrift = false;

    var straight = Math.abs(steer) < 0.18;
    var input = {
      throttle: recovering ? 0.70 : (cmd.throttle === undefined ? 1 : cmd.throttle),
      steer: steer,
      drift: wantDrift,
      boost: (!recovering && cmd.boost !== false && straight),
      fire: fire,
      shield: shield,
      mine: !!cmd.mine
    };
    api.setInput(input);

    var hud = document.querySelector('.pod-hud');
    var driftSlide = hud ? parseFloat(hud.style.getPropertyValue('--pod-drift-slide')) : NaN;
    var firedNow = g.weapon.shotsFired > prevShots; prevShots = g.weapon.shotsFired;
    var minedNow = g.mine.deployed > prevMines; prevMines = g.mine.deployed;

    return {
      lat: lat, steer: steer, recovering: recovering,
      near: near, aheadDist: ahead ? Math.round(aheadDist) : null,
      speed: Math.round(snap.game.speed || 0),
      firedNow: firedNow, minedNow: minedNow,
      shieldActive: !!g.shield.active,
      redline: !!g.redline.active,
      wreck: g.wreck.phase,
      bolts: projectiles.length, incoming: incoming,
      drift: isNaN(driftSlide) ? 0 : driftSlide,
      events: (snap.galactic.recentEvents || []).map(function (e) { return e.type; })
    };
  };
})();
`;
