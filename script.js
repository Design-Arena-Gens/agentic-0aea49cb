(() => {
  const preview = document.getElementById('preview');
  const generateBtn = document.getElementById('generateBtn');
  const regenBtn = document.getElementById('regenBtn');
  const downloadLink = document.getElementById('downloadLink');
  const statusEl = document.getElementById('status');

  let lastBlobUrl = null;

  const setStatus = (text) => {
    statusEl.textContent = text;
  };

  const supportsMime = (type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  };

  const pickMimeType = () => {
    if (supportsMime('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
    if (supportsMime('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus';
    if (supportsMime('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9';
    if (supportsMime('video/webm;codecs=vp8')) return 'video/webm;codecs=vp8';
    return 'video/webm';
  };

  function createFriesEmitter(width, height, count) {
    const fries = [];
    for (let i = 0; i < count; i++) {
      fries.push({
        x: Math.random() * width,
        y: Math.random() * -height,
        speed: 80 + Math.random() * 160,
        rotate: Math.random() * Math.PI * 2,
        size: 28 + Math.random() * 22,
        sway: Math.random() * 1.5 + 0.3,
      });
    }
    return fries;
  }

  function drawFrame(ctx, t, state) {
    const { width, height, fries } = state;
    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a1f33');
    g.addColorStop(1, '#0e111a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Soft vignette
    const vg = ctx.createRadialGradient(width/2, height/2, Math.min(width, height)/4, width/2, height/2, Math.max(width, height)/1.1);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);

    // Falling fries (??)
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (const f of fries) {
      const offsetX = Math.sin(t * 2 + f.x * 0.01) * 20 * f.sway;
      ctx.save();
      ctx.translate(f.x + offsetX, f.y);
      ctx.rotate(f.rotate + Math.sin(t * 1.2) * 0.1);
      ctx.font = `${f.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 8;
      ctx.fillText('??', 0, 0);
      ctx.restore();
    }

    // Center hero
    const pulse = 1 + Math.sin(t * 2.5) * 0.04;
    ctx.save();
    ctx.translate(width / 2, height / 2 - 40);
    ctx.scale(pulse, pulse);
    ctx.font = `200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.shadowBlur = 30;
    ctx.shadowColor = 'rgba(255, 187, 0, 0.6)';
    ctx.fillText('??', 0, 0);
    ctx.restore();

    // Title text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowBlur = 0;
    // Title with outline
    const title = 'FRENCH FRIES';
    ctx.font = 'bold 72px Inter, system-ui, sans-serif';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(title, width / 2, height / 2 + 80);
    const grad = ctx.createLinearGradient(width/2 - 200, 0, width/2 + 200, 0);
    grad.addColorStop(0, '#ffe066');
    grad.addColorStop(0.5, '#ffb13b');
    grad.addColorStop(1, '#ffd700');
    ctx.fillStyle = grad;
    ctx.fillText(title, width / 2, height / 2 + 80);

    // Tagline
    ctx.font = '600 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('crispy ? golden ? salty ? shareable', width / 2, height / 2 + 160);
    ctx.restore();

    // Progress bar
    const pct = Math.min(1, state.elapsed / state.duration);
    const barW = width * 0.6;
    const barH = 10;
    const barX = (width - barW) / 2;
    const barY = height - 80;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  function updateFries(state, dt) {
    const { fries, width, height } = state;
    for (const f of fries) {
      f.y += f.speed * dt;
      if (f.y > height + 40) {
        f.y = Math.random() * -height * 0.6 - 40;
        f.x = Math.random() * width;
      }
    }
  }

  async function generateVideo() {
    // UI state
    generateBtn.disabled = true;
    regenBtn.disabled = true;
    downloadLink.setAttribute('aria-disabled', 'true');
    setStatus('Rendering 10s video?');

    const durationMs = 10000;
    const fps = 30;
    const width = 1280;
    const height = 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Animation state
    const fries = createFriesEmitter(width, height, 80);
    const state = {
      width,
      height,
      fries,
      elapsed: 0,
      duration: durationMs / 1000,
    };

    // Audio (simple arpeggio)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    const master = audioCtx.createGain();
    master.gain.value = 0.15;
    master.connect(audioCtx.destination);
    const dest = audioCtx.createMediaStreamDestination();
    master.connect(dest);

    const notes = [261.63, 329.63, 392.00, 523.25]; // C major arpeggio
    let noteIndex = 0;
    const noteInterval = 250; // ms
    let musicTimer = null;

    function triggerNote(freq, lengthMs) {
      const osc = audioCtx.createOscillator();
      const gn = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gn.gain.setValueAtTime(0, audioCtx.currentTime);
      gn.gain.linearRampToValueAtTime(0.9, audioCtx.currentTime + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + lengthMs / 1000);
      osc.connect(gn).connect(master);
      osc.start();
      osc.stop(audioCtx.currentTime + lengthMs / 1000 + 0.02);
    }

    musicTimer = setInterval(() => {
      triggerNote(notes[noteIndex % notes.length], noteInterval);
      noteIndex += 1;
    }, noteInterval);

    // Streams
    const canvasStream = canvas.captureStream(fps);
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    let rafId = null;
    const startTime = performance.now();
    let lastTime = startTime;

    function frame(now) {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      state.elapsed = (now - startTime) / 1000;
      updateFries(state, dt);
      drawFrame(ctx, state.elapsed, state);
      if (state.elapsed * 1000 < durationMs) {
        rafId = requestAnimationFrame(frame);
      } else {
        try { recorder.stop(); } catch {}
      }
    }

    const stopAll = () => {
      try { clearInterval(musicTimer); } catch {}
      try { audioCtx.close(); } catch {}
      for (const track of combined.getTracks()) {
        try { track.stop(); } catch {}
      }
      for (const track of canvasStream.getTracks()) {
        try { track.stop(); } catch {}
      }
      if (rafId) cancelAnimationFrame(rafId);
    };

    const done = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start(Math.floor(1000 / fps));
    rafId = requestAnimationFrame(frame);

    // Wait until finished
    await done;
    stopAll();

    const blob = new Blob(chunks, { type: mimeType });
    if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
    const url = URL.createObjectURL(blob);
    lastBlobUrl = url;

    preview.src = url;
    preview.load();
    preview.play().catch(() => {});

    downloadLink.href = url;
    downloadLink.removeAttribute('aria-disabled');
    regenBtn.disabled = false;
    setStatus('Video ready!');
  }

  generateBtn.addEventListener('click', () => {
    generateVideo().catch((err) => {
      console.error(err);
      setStatus('Failed to generate video. See console.');
      generateBtn.disabled = false;
      regenBtn.disabled = false;
    });
  });

  regenBtn.addEventListener('click', () => {
    generateBtn.click();
  });
})();

