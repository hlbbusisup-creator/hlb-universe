(() => {
  "use strict";

  // 칼데라의 산책 (Caldera Promenade). A little chamber waltz in G major.
  // Each bar gives the cello bass, piano voicing, tune and answering phrase.
  // Durations are in quarter notes. A dash is a rest.
  const bars = [
    ["G2",  "D3 G3 B3 D4",   "B4:1 D5:.5 B4:.5 A4:1",      "-:3"],
    ["F#2", "D3 F#3 A3 D4",  "A4:1.5 F#4:.5 D4:1",         "A3:2 D4:1"],
    ["E2",  "B2 G3 B3 E4",   "G4:1 B4:.5 D5:.5 E5:1",      "-:1 G3:2"],
    ["D2",  "A2 F#3 B3 D4",  "D5:2 B4:.5 A4:.5",           "F#3:1 A3:2"],
    ["C3",  "G3 B3 C4 E4",   "G4:1 E5:1 D5:1",             "E3:1.5 G3:.5 B3:1"],
    ["B2",  "D3 G3 B3 D4",   "B4:1.5 A4:.5 G4:1",          "D4:2 B3:1"],
    ["A2",  "E3 G3 C4 E4",   "E4:1 G4:1 B4:.5 C5:.5",      "C4:1.5 B3:.5 A3:1"],
    ["D3",  "A3 C4 D4 F#4",  "A4:2 -:.5 D5:.5",            "F#3:2 A3:1"],

    ["C3",  "G3 C4 E4 G4",   "E4:1 G4:.5 E4:.5 D4:1",      "-:1 G4:1 C5:1"],
    ["B2",  "G3 B3 D4 G4",   "D4:1.5 B3:.5 G3:1",          "B4:2 -:1"],
    ["A2",  "E3 G3 C4 E4",   "C4:1 E4:1 G4:1",             "-:1 C5:1 B4:1"],
    ["G2",  "E3 G3 B3 E4",   "B4:2 G4:.5 E4:.5",           "E5:1.5 D5:.5 B4:1"],
    ["F#2", "C3 A3 C4 E4",   "A4:1 C5:1 A4:1",             "E5:1 C5:2"],
    ["B2",  "F#3 A3 B3 D#4", "F#4:1.5 D#4:.5 B3:1",        "D#5:2 F#4:1"],
    ["E2",  "B2 G3 B3 E4",   "E4:2 G4:.5 B4:.5",           "G4:1 -:1 B4:1"],
    ["D3",  "A3 C4 D4 F#4",  "A4:1 F#4:1 -:1",             "D5:2 A4:1"],

    ["G2",  "D3 G3 B3 D4",   "B4:1 D5:.5 B4:.5 A4:1",      "G3:2 D4:1"],
    ["F#2", "D3 F#3 A3 D4",  "A4:1.5 F#4:.5 D4:1",         "A3:1 D4:2"],
    ["E2",  "B2 G3 B3 E4",   "G4:1 B4:.5 D5:.5 G5:1",      "E4:2 B3:1"],
    ["D2",  "A2 F#3 B3 D4",  "F#5:1 D5:1 B4:1",            "F#3:1.5 A3:.5 D4:1"],
    ["C3",  "G3 B3 C4 E4",   "E5:1.5 G5:.5 E5:1",          "C4:1 D4:1 E4:1"],
    ["C#3", "G3 A3 C#4 E4",  "E5:1 C#5:.5 B4:.5 A4:1",     "A3:2 E4:1"],
    ["D3",  "G3 B3 D4 G4",   "B4:1 D5:1 G4:1",             "D4:1.5 B3:.5 G3:1"],
    ["D3",  "A3 C4 D4 F#4",  "A4:1.5 F#4:.5 D4:1",         "C4:2 A3:1"],

    ["E2",  "B2 G3 B3 E4",   "G4:1.5 B4:.5 E5:1",          "-:1 B3:1 G3:1"],
    ["C3",  "G3 B3 C4 E4",   "D5:1 B4:.5 G4:.5 E4:1",      "G3:1 C4:2"],
    ["B2",  "D3 G3 B3 D4",   "D4:1 G4:1 B4:1",             "-:1 D4:1 B3:1"],
    ["A2",  "E3 G3 C4 E4",   "C5:2 B4:.5 A4:.5",           "C4:1 G3:2"],
    ["C3",  "G3 B3 C4 E4",   "G4:1 E4:1 G4:1",             "E3:1 G3:1 B3:1"],
    ["D3",  "G3 B3 D4 G4",   "B4:1.5 A4:.5 G4:1",          "G3:2 B3:1"],
    ["D3",  "A3 C4 D4 F#4",  "A4:1 F#4:1 D4:1",            "C4:2 A3:1"],
    ["G2",  "D3 G3 B3 D4",   "G4:2 -:.5 A4:.5",            "B3:2 D4:1"]
  ];
  const beat = 60 / 72;
  const loopDuration = bars.length * 3 * beat;

  function frequency(pitch) {
    const [, letter, sharp, octave] = /^([A-G])(#?)(\d)$/.exec(pitch);
    const semitone = (Number(octave) + 1) * 12 + {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter] + Number(Boolean(sharp));
    return 440 * 2 ** ((semitone - 69) / 12);
  }

  function arrange() {
    const notes = [];
    const dynamics = [.83, .83, .89, .92, .99, .92, .88, .77, .85, .83, .91, .97, 1.02, .99, .89, .79,
                      .90, .92, .98, 1.02, 1.08, 1.01, .93, .83, .89, .86, .88, .89, .83, .79, .74, .71];
    bars.forEach(([bass, voicing, melody, answer], bar) => {
      function note(voice, pitch, start, length, velocity) {
        notes.push({voice, hz:frequency(pitch), at:(bar * 3 + start) * beat,
          duration:length * beat, strength:velocity * dynamics[bar]});
      }
      function line(voice, phrase, velocity, delay = 0) {
        let pos = 0;
        for (const token of phrase.split(" ")) {
          const [pitch, length] = token.split(":");
          const beats = Number(length);
          if (pitch !== "-") note(voice, pitch, pos + delay, beats * .95, velocity * (pos === 0 ? 1 : .93));
          pos += beats;
        }
      }
      const development = bar >= 8 && bar < 16, reprise = bar >= 16 && bar < 24;
      const chord = voicing.split(" ");
      line(development ? "cello" : reprise ? "viola" : "piano", melody, development ? .88 : 1);
      line(development ? "piano" : reprise ? "piano" : "viola", answer, development ? .62 : .45, .022);
      note(development ? "piano" : "cello", bass, .012, bar % 4 === 3 ? 2.25 : 2.78, development ? .70 : .59);
      // A rocking broken chord leaves space for the tune; the short cadence
      // at the end of each phrase lets the strings and room decay breathe.
      note("piano", chord[0], .032, 1.2, .58);
      if (bar % 4 !== 3) note("piano", chord[1], .54, .65, .41);
      note("piano", chord[2], 1.02, .84, .54);
      if (bar % 2 === 0) note("piano", chord[3], 1.535, .79, .47);
      note("piano", chord[bar % 2 ? 1 : 2], 2.035, .76, .42);
      if (bar % 4 === 1) note("piano", chord[0], 2.55, .46, .34);
    });
    return notes.sort((a,b) => a.at - b.at);
  }
  const score = arrange();

  function makeEnsemble(ctx, destination) {
    const mix = ctx.createGain();
    mix.gain.value = 1.75;
    const room = ctx.createConvolver();
    const wet = ctx.createGain();
    wet.gain.value = .18;
    const irLength = Math.round(ctx.sampleRate * 1.42);
    const impulse = ctx.createBuffer(2, irLength, ctx.sampleRate);
    let seed = 1903;
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let low = 0;
      for (let i = 0; i < irLength; i++) {
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        low += .38 * (seed / 2147483648 - 1 - low);
        const t = i / ctx.sampleRate;
        data[i] = t > .022 ? low * Math.exp(-5.7 * t) : 0;
      }
    }
    room.buffer = impulse;
    mix.connect(destination);
    mix.connect(room).connect(wet).connect(destination);
    const instruments = {};
    for (const [name, pan] of [["piano", -.18], ["cello", .17], ["viola", .28]]) {
      const seat = ctx.createStereoPanner();
      seat.pan.value = pan;
      seat.connect(mix);
      instruments[name] = seat;
    }
    const waves = new Map();
    function tone(voice, hz) {
      const key = voice + hz;
      if (waves.has(key)) return waves.get(key);
      const real = new Float32Array(29), imag = new Float32Array(29);
      const felt = [0,1,.53,.25,.14,.088,.058,.032,.027,.020,.014,.007];
      for (let h = 1; h < imag.length; h++) {
        if (h * hz > ctx.sampleRate * .45) break;
        const f = hz * h;
        const formant = (center, width) => Math.exp(-((f-center) ** 2) / (2 * width ** 2));
        if (voice === "piano") imag[h] = felt[h] || 0;
        else {
          const cello = voice === "cello";
          imag[h] = (.47 + .72*formant(cello ? 315 : 440,130) + .48*formant(cello ? 650 : 810,190)
            + .19*formant(1700,390)) / h ** .91;
        }
      }
      const wave = ctx.createPeriodicWave(real, imag);
      waves.set(key, wave);
      return wave;
    }

    return function sound(event, time) {
      const {voice, hz, duration, strength} = event;
      const piano = voice === "piano";
      const gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = .42;
      const level = strength * (piano ? .174 : voice === "viola" ? .103 : .127);
      const end = time + duration + (piano ? .42 : .13);
      gain.gain.setValueAtTime(.00006, time);
      if (piano) {
        gain.gain.exponentialRampToValueAtTime(level, time + .008);
        gain.gain.exponentialRampToValueAtTime(level * .57, time + .115);
        gain.gain.exponentialRampToValueAtTime(level * .24, time + duration);
        filter.frequency.setValueAtTime(2200 + hz * 4, time);
        filter.frequency.exponentialRampToValueAtTime(720 + hz * 1.8, time + duration + .18);
      } else {
        gain.gain.linearRampToValueAtTime(level * .83, time + Math.min(.17, duration * .24));
        gain.gain.linearRampToValueAtTime(level, time + duration * .57);
        gain.gain.linearRampToValueAtTime(level * .70, time + duration);
        filter.frequency.value = voice === "cello" ? 2250 : 2900;
      }
      gain.gain.exponentialRampToValueAtTime(.00006, end);
      filter.connect(gain).connect(instruments[voice]);
      const wave = ctx.createOscillator();
      wave.frequency.value = hz;
      wave.setPeriodicWave(tone(voice, hz));
      wave.connect(filter);
      const companions = [];
      if (piano) {
        // A quieter second string, slightly stretched, warms the hammer attack.
        const second = ctx.createOscillator(), felt = ctx.createGain();
        second.frequency.value = hz * 2.0019;
        felt.gain.setValueAtTime(.24, time);
        felt.gain.exponentialRampToValueAtTime(.024, end);
        second.connect(felt).connect(filter);
        companions.push([second, felt]);
      } else {
        const vibrato = ctx.createOscillator(), depth = ctx.createGain();
        vibrato.frequency.value = voice === "cello" ? 4.7 : 5.35;
        depth.gain.setValueAtTime(.7, time);
        depth.gain.linearRampToValueAtTime(voice === "cello" ? 8 : 10, time + Math.min(.48, duration * .7));
        vibrato.connect(depth).connect(wave.detune);
        companions.push([vibrato, depth]);
      }
      for (const [osc] of companions) { osc.start(time); osc.stop(end + .01); }
      wave.onended = () => {
        wave.disconnect(); filter.disconnect(); gain.disconnect();
        for (const [osc, gainNode] of companions) { osc.disconnect(); gainNode.disconnect(); }
      };
      wave.start(time); wave.stop(end + .01);
    };
  }

  const prefKey = "hlb-universe.chamber-music";
  const defaultVolume = .46;
  const validVolume = n => Number.isFinite(n) && n >= 0 && n <= 1;
  function create({onChange} = {}) {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    let available = Boolean(AudioEngine), volume = defaultVolume, lastAudible = defaultVolume, muted = false;
    try {
      const saved = JSON.parse(localStorage.getItem(prefKey));
      if (validVolume(saved?.volume)) volume = saved.volume;
      if (validVolume(saved?.lastAudible) && saved.lastAudible > 0) lastAudible = saved.lastAudible;
      muted = saved?.muted === true || volume === 0;
    } catch { /* Storage may be disabled in private browsing. */ }
    let ctx, master, playNote, timer, suspendTimer, resumePending, disposed = false;
    let start = null, cycle = 0, index = 0, engaged = false, lastState = "";
    const getState = () => ({volume, muted, available,
      playing:Boolean(ctx?.state === "running" && !muted && !document.hidden && !disposed)});

    function notify() {
      const state = getState(), signature = JSON.stringify(state);
      if (signature !== lastState) { lastState = signature; onChange?.(state); }
    }
    function pump() {
      clearTimeout(timer);
      if (disposed || document.hidden || muted || ctx?.state !== "running") return;
      if (start === null) start = ctx.currentTime + .055;
      // Place notes on the audio clock, so timer jitter cannot alter tempo.
      // If a backgrounded browser slept, skip expired attacks rather than catch up audibly.
      const now = ctx.currentTime;
      if (now > start + (cycle + 1) * loopDuration) {
        cycle = Math.floor((now - start) / loopDuration);
        index = 0;
      }
      while (true) {
        const event = score[index], time = start + cycle * loopDuration + event.at;
        if (time >= now + 1.35) break;
        if (time >= now - .035) playNote(event, Math.max(time, now));
        if (++index === score.length) { index = 0; cycle++; }
      }
      timer = setTimeout(pump, 240);
    }
    function applyGain() {
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(muted ? 0 : volume ** 1.55, ctx.currentTime, .028);
    }
    function unlock() {
      if (disposed || !available || muted || document.hidden) return;
      clearTimeout(suspendTimer);
      engaged = true;
      if (!ctx) {
        try {
          ctx = new AudioEngine();
          master = ctx.createGain();
          master.gain.value = 0;
          master.connect(ctx.destination);
          playNote = makeEnsemble(ctx, master);
          ctx.onstatechange = () => {
            if (ctx.state === "running") {
              if (document.hidden || muted) suspend();
              else pump();
            }
            notify();
          };
        } catch {
          available = false;
          if (ctx) ctx.close().catch(() => {});
          notify();
          return;
        }
      }
      applyGain();
      if (ctx.state === "running") { pump(); notify(); return; }
      if (!resumePending) {
        resumePending = ctx.resume().then(() => { if (!disposed) { pump(); notify(); } })
          .catch(() => {}).finally(() => { resumePending = null; });
      }
    }
    function suspend() {
      clearTimeout(timer);
      if (ctx && ctx.state === "running") {
        ctx.suspend().then(() => {
          if (engaged && !disposed && !muted && !document.hidden) unlock();
        }).catch(() => {});
      }
    }
    function save() {
      try { localStorage.setItem(prefKey, JSON.stringify({volume, lastAudible, muted})); } catch {}
      clearTimeout(suspendTimer);
      if (muted) { applyGain(); suspendTimer = setTimeout(suspend, 150); }
      else unlock();
      notify();
    }
    function setVolume(value) {
      if (!Number.isFinite(value) || disposed) return;
      volume = Math.max(0, Math.min(1, value));
      muted = volume === 0;
      if (volume) lastAudible = volume;
      save();
    }
    function setMuted(value) {
      if (disposed) return;
      muted = Boolean(value);
      if (!muted && volume === 0) volume = lastAudible;
      save();
    }
    function gesture() {
      if (!ctx || ctx.state !== "running") unlock();
    }
    function visibility() {
      if (document.hidden) suspend();
      else if (engaged) unlock();
      notify();
    }
    for (const name of ["pointerup", "click", "keydown"]) document.addEventListener(name, gesture, {capture:true, passive:true});
    document.addEventListener("visibilitychange", visibility);
    if (available && !muted && typeof navigator.getAutoplayPolicy === "function") {
      try {
        if (navigator.getAutoplayPolicy("audiocontext") === "allowed") queueMicrotask(unlock);
      } catch { /* Browsers without an audio-context policy start on the first gesture. */ }
    }
    function dispose() {
      disposed = true;
      clearTimeout(timer); clearTimeout(suspendTimer);
      for (const name of ["pointerup", "click", "keydown"]) document.removeEventListener(name, gesture, true);
      document.removeEventListener("visibilitychange", visibility);
      if (ctx) { ctx.onstatechange = null; ctx.close().catch(() => {}); }
    }
    return {getState, unlock, setMuted, setVolume, dispose};
  }
  window.HLBChamberMusic = {create};
})();
