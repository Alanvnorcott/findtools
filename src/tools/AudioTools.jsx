import { useEffect, useMemo, useRef, useState } from "react";
import { ActionRow, CountdownTimer, InlineMessage, KeyValueList, RangeField, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";
import {
  applyFade,
  applyGain,
  centerCancel,
  computeTimerSeconds,
  computeWaveformPeaks,
  createNoiseSamples,
  describeSpectralNoise,
  encodeWav,
  estimateBpm,
  formatTimerLabel,
  mergeChannelsSequentially,
  normalizeChannel,
  removeSilence,
  resampleChannel,
  shiftPitchBySemitones,
  trimChannel
} from "../lib/toolLogic/audio";
import { bytesToSize, downloadBlob, formatNumber } from "../lib/utils";

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

async function createAudioContext() {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    throw new Error("This browser does not support the Web Audio API.");
  }
  const context = new AudioContextCtor();
  if (context.state === "suspended") await context.resume();
  return context;
}

async function decodeAudioFile(file, context) {
  const bytes = await file.arrayBuffer();
  return context.decodeAudioData(bytes.slice(0));
}

function audioBufferToChannels(buffer) {
  return Array.from({ length: buffer.numberOfChannels }, (_, index) => Float32Array.from(buffer.getChannelData(index)));
}

async function decodeAudioFiles(files) {
  const context = await createAudioContext();
  try {
    const decoded = [];
    for (const file of files) {
      const buffer = await decodeAudioFile(file, context);
      decoded.push({
        file,
        buffer,
        channels: audioBufferToChannels(buffer),
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        numberOfChannels: buffer.numberOfChannels
      });
    }
    return decoded;
  } finally {
    await context.close().catch(() => {});
  }
}

function useObjectUrl() {
  const [url, setUrl] = useState("");

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );

  const update = (value) => {
    setUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return value ? URL.createObjectURL(value) : "";
    });
  };

  return [url, update];
}

function useProcessedAudioResult() {
  const [processedBlob, setProcessedBlob] = useState(null);
  const [previewUrl, setPreviewObject] = useObjectUrl();

  const setProcessedResult = (blob) => {
    setProcessedBlob(blob);
    setPreviewObject(blob);
  };

  const clearProcessedResult = () => {
    setProcessedBlob(null);
    setPreviewObject(null);
  };

  return { processedBlob, previewUrl, setProcessedResult, clearProcessedResult };
}

function useSingleAudioFile(emptyMessage) {
  const [file, setFile] = useState(null);
  const [decoded, setDecoded] = useState(null);
  const [status, setStatus] = useState(emptyMessage);
  const [sourceUrl, setSourceObject] = useObjectUrl();

  const onFileChange = async (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setDecoded(null);
    if (!nextFile) {
      setSourceObject(null);
      setStatus(emptyMessage);
      return;
    }
    setSourceObject(nextFile);
    setStatus(`Loading ${nextFile.name}...`);
    try {
      const [item] = await decodeAudioFiles([nextFile]);
      setDecoded(item);
      setStatus(`Loaded ${nextFile.name}.`);
    } catch (error) {
      setStatus(error.message || "Could not read that audio file.");
    }
  };

  const clear = () => {
    setFile(null);
    setDecoded(null);
    setSourceObject(null);
    setStatus(emptyMessage);
  };

  return { file, decoded, onFileChange, clear, status, setStatus, sourceUrl };
}

function useMultiAudioFiles(emptyMessage) {
  const [files, setFiles] = useState([]);
  const [decoded, setDecoded] = useState([]);
  const [status, setStatus] = useState(emptyMessage);

  const onFilesChange = async (event) => {
    const nextFiles = [...(event.target.files || [])];
    setFiles(nextFiles);
    setDecoded([]);
    if (!nextFiles.length) {
      setStatus(emptyMessage);
      return;
    }
    setStatus(`Loading ${nextFiles.length} files...`);
    try {
      const items = await decodeAudioFiles(nextFiles);
      setDecoded(items);
      setStatus(`Loaded ${items.length} audio files.`);
    } catch (error) {
      setStatus(error.message || "Could not read those audio files.");
    }
  };

  const clear = () => {
    setFiles([]);
    setDecoded([]);
    setStatus(emptyMessage);
  };

  return { files, decoded, onFilesChange, clear, status, setStatus };
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  if (total >= 3600) return `${(total / 3600).toFixed(2)} hr`;
  if (total >= 60) return `${(total / 60).toFixed(2)} min`;
  return `${total.toFixed(2)} sec`;
}

function summarizeDecoded(decoded) {
  if (!decoded) return [];
  return [
    { label: "Duration", value: formatDuration(decoded.duration) },
    { label: "Sample rate", value: `${formatNumber(decoded.sampleRate)} Hz` },
    { label: "Channels", value: String(decoded.numberOfChannels) },
    { label: "Approx. samples", value: formatNumber(decoded.channels[0]?.length || 0) },
    { label: "Original size", value: bytesToSize(decoded.file?.size || 0) }
  ];
}

function TimerFields({ timer, setTimer }) {
  const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
  return (
    <div className="stack-sm">
      <div className="split-fields split-fields--timer">
        <ToolInput label="Timer hours">
          <input
            min="0"
            type="number"
            value={timer.hours}
            onChange={(event) => setTimer((current) => ({ ...current, hours: event.target.value }))}
          />
        </ToolInput>
        <ToolInput label="Timer minutes">
          <input
            min="0"
            type="number"
            value={timer.minutes}
            onChange={(event) => setTimer((current) => ({ ...current, minutes: event.target.value }))}
          />
        </ToolInput>
        <ToolInput label="Timer seconds">
          <input
            min="0"
            type="number"
            value={timer.seconds}
            onChange={(event) => setTimer((current) => ({ ...current, seconds: event.target.value }))}
          />
        </ToolInput>
      </div>
      <p className="helper-note">{total ? `Playback will stop after ${formatTimerLabel(total)}.` : "Leave all timer fields at 0 for continuous playback."}</p>
    </div>
  );
}

function TimerSection({ timer, setTimer }) {
  return (
    <div className="field">
      <span className="field__label">Timer (optional)</span>
      <TimerFields timer={timer} setTimer={setTimer} />
    </div>
  );
}

function AudioOutput({ status, previewUrl, metaItems, countdown, extra }) {
  return (
    <div className="stack-sm">
      <ResultPanel value={status} />
      {countdown ? countdown : null}
      {previewUrl ? (
        <ResultPanel title="Preview">
          <audio controls className="audio-player" src={previewUrl} />
        </ResultPanel>
      ) : null}
      {metaItems?.length ? (
        <ResultPanel title="Details">
          <KeyValueList items={metaItems} />
        </ResultPanel>
      ) : null}
      {extra}
    </div>
  );
}

function useCountdownController() {
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [isActive, setIsActive] = useState(false);

  const stop = ({ reset = true } = {}) => {
    window.clearTimeout(timeoutRef.current);
    window.clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
    setIsActive(false);
    if (reset) setRemainingSeconds(null);
  };

  const start = (totalSeconds, onFinish) => {
    stop();
    if (!(totalSeconds > 0)) {
      setRemainingSeconds(null);
      return;
    }
    const endAt = Date.now() + totalSeconds * 1000;
    setRemainingSeconds(totalSeconds);
    setIsActive(true);
    intervalRef.current = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemainingSeconds(next);
    }, 250);
    timeoutRef.current = window.setTimeout(() => {
      stop({ reset: false });
      setRemainingSeconds(0);
      onFinish?.();
    }, totalSeconds * 1000);
  };

  useEffect(() => () => stop(), []);

  return { remainingSeconds, isActive, start, stop };
}

function TimerCountdownPanel({ remainingSeconds, isActive }) {
  return <CountdownTimer active={isActive} idleText="Start playback to begin a live countdown." remainingSeconds={remainingSeconds} />;
}

function useAudioController() {
  const contextRef = useRef(null);
  const cleanupRef = useRef(() => {});
  const [isPlaying, setIsPlaying] = useState(false);
  const countdown = useCountdownController();

  const stop = ({ resetCountdown = true } = {}) => {
    countdown.stop({ reset: resetCountdown });
    try {
      cleanupRef.current?.();
    } catch {
      // Cleanup should never crash the page.
    }
    cleanupRef.current = () => {};
    setIsPlaying(false);
  };

  const ensureContext = async () => {
    if (!contextRef.current || contextRef.current.state === "closed") {
      contextRef.current = await createAudioContext();
    }
    if (contextRef.current.state === "suspended") {
      await contextRef.current.resume();
    }
    return contextRef.current;
  };

  const start = async (setup, timerSeconds = 0) => {
    stop();
    const context = await ensureContext();
    cleanupRef.current = (await setup(context)) || (() => {});
    setIsPlaying(true);
    if (timerSeconds > 0) {
      countdown.start(timerSeconds, () => stop({ resetCountdown: false }));
    }
  };

  useEffect(
    () => () => {
      stop();
      contextRef.current?.close?.().catch?.(() => {});
    },
    []
  );

  return { isPlaying, start, stop, remainingSeconds: countdown.remainingSeconds, timerActive: countdown.isActive };
}

function createNoiseLoop(context, color) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  buffer.copyToChannel(createNoiseSamples(color, buffer.length), 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function connectSequentialNodes(source, nodes, destination) {
  let current = source;
  for (const node of nodes) {
    current.connect(node);
    current = node;
  }
  current.connect(destination);
}

function createPeakingFilter(context, frequency, gain, q = 0.9) {
  const filter = context.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.value = frequency;
  filter.Q.value = q;
  filter.gain.value = gain;
  return filter;
}

function createShelfFilter(context, type, frequency, gain) {
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.gain.value = gain;
  return filter;
}

function buildSpectralNoiseGraph(context, { alpha, level, lowpass, highpass, bandpass, bandQ = 0.8, modulationRate = 0, modulationDepth = 0 }) {
  const source = createNoiseLoop(context, "white");
  const nodes = [];

  if (highpass) {
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;
    nodes.push(filter);
  }

  for (const frequency of [63, 125, 250, 500, 2000, 4000, 8000]) {
    const octaveDistance = Math.log2(frequency / 1000);
    const gain = Math.max(-24, Math.min(24, -3 * Number(alpha) * octaveDistance));
    nodes.push(createPeakingFilter(context, frequency, gain));
  }

  if (bandpass) {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = bandpass;
    filter.Q.value = bandQ;
    nodes.push(filter);
  }

  if (lowpass) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    nodes.push(filter);
  }

  const gain = context.createGain();
  gain.gain.value = level;
  nodes.push(gain);

  connectSequentialNodes(source, nodes, context.destination);
  source.start();

  let lfo = null;
  let lfoGain = null;
  if (modulationRate > 0 && modulationDepth > 0) {
    lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = modulationRate;
    lfoGain = context.createGain();
    lfoGain.gain.value = modulationDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    gain.gain.value = Math.max(0.02, level - modulationDepth);
    lfo.start();
  }

  return () => {
    try {
      source.stop();
    } catch {
      // Ignore duplicate stop calls.
    }
    source.disconnect();
    nodes.forEach((node) => node.disconnect());
    if (lfo) {
      try {
        lfo.stop();
      } catch {
        // Ignore duplicate stop calls.
      }
      lfo.disconnect();
    }
    lfoGain?.disconnect?.();
  };
}

function buildGreyNoiseGraph(context, { level, contour }) {
  const source = createNoiseLoop(context, "white");
  const nodes = [
    createShelfFilter(context, "lowshelf", 180, 8 * contour),
    createPeakingFilter(context, 3500, -5 * contour, 0.9),
    createShelfFilter(context, "highshelf", 5000, 3 * contour),
    createPeakingFilter(context, 900, 1.5 * contour, 1.1)
  ];
  const gain = context.createGain();
  gain.gain.value = level;
  nodes.push(gain);
  connectSequentialNodes(source, nodes, context.destination);
  source.start();
  return () => {
    try {
      source.stop();
    } catch {
      // Ignore duplicate stop calls.
    }
    source.disconnect();
    nodes.forEach((node) => node.disconnect());
  };
}

function buildGreenNoiseGraph(context, { centerFrequency, level, width }) {
  const source = createNoiseLoop(context, "white");
  const nodes = [];
  const bandpass = context.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = centerFrequency;
  bandpass.Q.value = width;
  nodes.push(bandpass);
  nodes.push(createShelfFilter(context, "lowshelf", 220, -8));
  nodes.push(createShelfFilter(context, "highshelf", 3200, -5));
  const gain = context.createGain();
  gain.gain.value = level;
  nodes.push(gain);
  connectSequentialNodes(source, nodes, context.destination);
  source.start();
  return () => {
    try {
      source.stop();
    } catch {
      // Ignore duplicate stop calls.
    }
    source.disconnect();
    nodes.forEach((node) => node.disconnect());
  };
}

const spectralNoiseFamilies = {
  white: {
    title: "White Noise",
    description: "Flat spectrum with equal power at all frequencies. This browser generator targets α≈0 and a 0 dB per octave slope.",
    defaultAlpha: "0",
    minAlpha: "-0.2",
    maxAlpha: "0.2",
    defaultLevel: "0.22"
  },
  pink: {
    title: "Pink Noise",
    description: "Equal-energy-per-octave noise. This browser generator targets α≈1 and a −3 dB per octave slope.",
    defaultAlpha: "1",
    minAlpha: "0.75",
    maxAlpha: "1.25",
    defaultLevel: "0.22"
  },
  brown: {
    title: "Brown Noise",
    description: "Low-frequency-weighted noise with a deep, smooth character. This browser generator targets α≈2 and a −6 dB per octave slope.",
    defaultAlpha: "2",
    minAlpha: "1.75",
    maxAlpha: "2.5",
    defaultLevel: "0.16"
  },
  blue: {
    title: "Blue Noise",
    description: "High-frequency-rising noise. This browser generator targets α≈−1 and a +3 dB per octave slope.",
    defaultAlpha: "-1",
    minAlpha: "-1.25",
    maxAlpha: "-0.75",
    defaultLevel: "0.14"
  },
  violet: {
    title: "Violet Noise",
    description: "Very bright high-frequency-weighted noise. This browser generator targets α≈−2 and a +6 dB per octave slope.",
    defaultAlpha: "-2",
    minAlpha: "-2.5",
    maxAlpha: "-1.75",
    defaultLevel: "0.1"
  },
  black: {
    title: "Black Noise",
    description: "Informal extra-dark noise with very low overall energy. This browser generator uses α>2, a low-pass bias, and slow amplitude drift.",
    defaultAlpha: "2.7",
    minAlpha: "2.25",
    maxAlpha: "3.25",
    defaultLevel: "0.08",
    lowpass: 160,
    modulationRate: 0.08,
    modulationDepth: 0.04
  }
};

function NoiseProfileDetails({ profile, extraNote }) {
  return (
    <InlineMessage tone="neutral">
      {profile.displayName} uses S(f) ∝ 1/f^α with α≈{profile.alpha} and a {profile.slope > 0 ? "+" : ""}{profile.slope} dB per octave slope.
      {" "}
      {profile.technicalLabel}.
      {extraNote ? ` ${extraNote}` : ""}
    </InlineMessage>
  );
}

function SpectralNoiseTool({ tool, familyKey, instructions, ...shellProps }) {
  const family = spectralNoiseFamilies[familyKey];
  const audio = useAudioController();
  const [timer, setTimer] = useState({ hours: "0", minutes: "30", seconds: "0" });
  const [alpha, setAlpha] = useState(family.defaultAlpha);
  const [level, setLevel] = useState(family.defaultLevel);
  const [status, setStatus] = useState(`Start playback to generate ${family.title.toLowerCase()}.`);
  const profile = describeSpectralNoise(alpha);
  tool.copyValue = () => status;

  const play = async () => {
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    try {
      await audio.start((context) => buildSpectralNoiseGraph(context, {
        alpha,
        level: Number(level),
        lowpass: family.lowpass,
        highpass: family.highpass,
        bandpass: family.bandpass,
        bandQ: family.bandQ,
        modulationRate: family.modulationRate,
        modulationDepth: family.modulationDepth
      }), total);
      setStatus(total ? `Playing ${profile.displayName.toLowerCase()} for ${formatTimerLabel(total)}.` : `Playing ${profile.displayName.toLowerCase()}.`);
    } catch (error) {
      setStatus(error.message || "Playback could not be started.");
    }
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions={instructions}
      inputArea={
        <>
          <RangeField label="Spectral tilt α" max={family.maxAlpha} min={family.minAlpha} step="0.05" value={alpha} onChange={setAlpha} />
          <RangeField label="Level" max="0.4" min="0.04" step="0.01" value={level} onChange={setLevel} />
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={play} type="button">Start playback</button>
            <button className="button button--secondary" onClick={() => { audio.stop(); setStatus("Playback stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={
        <AudioOutput
          status={status}
          countdown={<TimerCountdownPanel isActive={audio.timerActive} remainingSeconds={audio.remainingSeconds} />}
          metaItems={[
            { label: "Noise family", value: profile.displayName },
            { label: "Alpha", value: String(profile.alpha) },
            { label: "Slope", value: `${profile.slope > 0 ? "+" : ""}${profile.slope} dB/octave` },
            { label: "Level", value: level }
          ]}
          extra={<NoiseProfileDetails extraNote={family.description} profile={profile} />}
        />
      }
    />
  );
}

export function GreenNoiseGeneratorTool({ tool, ...shellProps }) {
  const audio = useAudioController();
  const [timer, setTimer] = useState({ hours: "0", minutes: "30", seconds: "0" });
  const [centerFrequency, setCenterFrequency] = useState("1000");
  const [width, setWidth] = useState("0.9");
  const [level, setLevel] = useState("0.2");
  const [status, setStatus] = useState("Start playback to generate green noise.");
  tool.copyValue = () => status;

  const play = async () => {
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    try {
      await audio.start((context) => buildGreenNoiseGraph(context, { centerFrequency: Number(centerFrequency), width: Number(width), level: Number(level) }), total);
      setStatus(total ? `Playing green noise for ${formatTimerLabel(total)}.` : "Playing green noise.");
    } catch (error) {
      setStatus(error.message || "Playback could not be started.");
    }
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Emphasize the midrange where human hearing is most sensitive. Green noise is not standardized, so this tool makes the center frequency explicit."
      inputArea={
        <>
          <RangeField label="Center frequency (Hz)" max="2000" min="500" step="10" value={centerFrequency} onChange={setCenterFrequency} />
          <RangeField label="Band width (Q)" max="1.4" min="0.5" step="0.05" value={width} onChange={setWidth} />
          <RangeField label="Level" max="0.4" min="0.04" step="0.01" value={level} onChange={setLevel} />
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={play} type="button">Start playback</button>
            <button className="button button--secondary" onClick={() => { audio.stop(); setStatus("Playback stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={status} countdown={<TimerCountdownPanel isActive={audio.timerActive} remainingSeconds={audio.remainingSeconds} />} metaItems={[{ label: "Profile", value: "Green Noise" }, { label: "Center band", value: `${centerFrequency} Hz` }, { label: "Band width", value: width }]} extra={<InlineMessage tone="neutral">Green noise is not a standardized 1/f^α color. This generator intentionally focuses energy around the 500 Hz to 2 kHz region.</InlineMessage>} />}
    />
  );
}

export function GreyNoiseGeneratorTool({ tool, ...shellProps }) {
  const audio = useAudioController();
  const [timer, setTimer] = useState({ hours: "0", minutes: "30", seconds: "0" });
  const [contour, setContour] = useState("1");
  const [level, setLevel] = useState("0.18");
  const [status, setStatus] = useState("Start playback to generate grey noise.");
  tool.copyValue = () => status;

  const play = async () => {
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    try {
      await audio.start((context) => buildGreyNoiseGraph(context, { contour: Number(contour), level: Number(level) }), total);
      setStatus(total ? `Playing grey noise for ${formatTimerLabel(total)}.` : "Playing grey noise.");
    } catch (error) {
      setStatus(error.message || "Playback could not be started.");
    }
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Approximate perceptual equal-loudness shaping. Grey noise is not a simple power-law color, so this tool exposes the loudness contour amount."
      inputArea={
        <>
          <RangeField label="Equal-loudness contour" max="1.5" min="0.5" step="0.05" value={contour} onChange={setContour} />
          <RangeField label="Level" max="0.35" min="0.04" step="0.01" value={level} onChange={setLevel} />
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={play} type="button">Start playback</button>
            <button className="button button--secondary" onClick={() => { audio.stop(); setStatus("Playback stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={status} countdown={<TimerCountdownPanel isActive={audio.timerActive} remainingSeconds={audio.remainingSeconds} />} metaItems={[{ label: "Profile", value: "Grey Noise" }, { label: "Contour", value: contour }]} extra={<InlineMessage tone="neutral">Grey noise is not defined by a single α value. This generator uses a practical equal-loudness contour approximation instead of pretending it is a pure 1/f^α slope.</InlineMessage>} />}
    />
  );
}

export function SleepNoiseTool({ tool, ...shellProps }) {
  const audio = useAudioController();
  const [timer, setTimer] = useState({ hours: "3", minutes: "0", seconds: "0" });
  const [alpha, setAlpha] = useState("0.9");
  const [level, setLevel] = useState("0.18");
  const [status, setStatus] = useState("Dial in a custom sleep-noise blend and start playback.");
  const profile = describeSpectralNoise(alpha);
  tool.copyValue = () => status;

  const play = async () => {
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    try {
      await audio.start((context) => buildSpectralNoiseGraph(context, {
        alpha,
        level: Number(level),
        lowpass: 2800
      }), total);
      setStatus(total ? `Playing ${profile.displayName.toLowerCase()} for ${formatTimerLabel(total)}.` : `Playing ${profile.displayName.toLowerCase()}.`);
    } catch (error) {
      setStatus(error.message || "Playback could not be started.");
    }
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Create a custom sleep-noise blend on the brown-to-white spectrum. Standard color names stay exact where they exist; custom blend names are descriptive shorthand."
      inputArea={
        <>
          <RangeField label="Sleep blend α" max="2" min="0" step="0.05" value={alpha} onChange={setAlpha} />
          <RangeField label="Level" max="0.35" min="0.04" step="0.01" value={level} onChange={setLevel} />
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={play} type="button">Start playback</button>
            <button className="button button--secondary" onClick={() => { audio.stop(); setStatus("Playback stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={
        <AudioOutput
          status={status}
          countdown={<TimerCountdownPanel isActive={audio.timerActive} remainingSeconds={audio.remainingSeconds} />}
          metaItems={[
            { label: "Blend name", value: profile.displayName },
            { label: "Technical label", value: profile.technicalLabel },
            { label: "Alpha", value: String(profile.alpha) },
            { label: "Slope", value: `${profile.slope > 0 ? "+" : ""}${profile.slope} dB/octave` }
          ]}
          extra={<InlineMessage tone="neutral">Custom blend names are there to make the sound memorable. The accurate measure is α and the corresponding dB-per-octave slope.</InlineMessage>}
        />
      }
    />
  );
}

export function AudioConverterTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file to convert into a local WAV download.");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    return encodeWav(fileState.decoded.channels, fileState.decoded.sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus(`Preview ready for converted.wav (${bytesToSize(blob.size)}).`);
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "converted.wav");
    fileState.setStatus(`Downloaded converted.wav (${bytesToSize(blob.size)}).`);
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Convert a supported audio file into a browser-generated WAV download."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview WAV</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} />}
    />
  );
}

export function AudioCutterTrimmerTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file, then set a trim range.");
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("10");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  useEffect(() => {
    if (fileState.decoded) {
      setEnd(String(Math.max(1, Math.round(fileState.decoded.duration))));
    }
  }, [fileState.decoded]);

  const buildProcessedBlob = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    const channels = fileState.decoded.channels.map((channel) => trimChannel(channel, fileState.decoded.sampleRate, start, end));
    return encodeWav(channels, fileState.decoded.sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus(`Preview ready for trimmed.wav (${formatDuration(Number(end) - Number(start))}).`);
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "trimmed.wav");
    fileState.setStatus(`Downloaded trimmed.wav (${formatDuration(Number(end) - Number(start))}).`);
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Cut a section out of an audio file and export the selected range as WAV."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <div className="split-fields">
            <ToolInput label="Start (seconds)">
              <input min="0" type="number" value={start} onChange={(event) => setStart(event.target.value)} />
            </ToolInput>
            <ToolInput label="End (seconds)">
              <input min="0" type="number" value={end} onChange={(event) => setEnd(event.target.value)} />
            </ToolInput>
          </div>
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview trim</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Reset</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} />}
    />
  );
}

export function VolumeBoosterNormalizerTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file to boost or normalize.");
  const [gain, setGain] = useState("1.5");
  const [normalize, setNormalize] = useState(true);
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    const channels = fileState.decoded.channels.map((channel) => {
      const leveled = normalize ? normalizeChannel(channel, 0.92) : Float32Array.from(channel);
      return applyGain(leveled, gain);
    });
    return encodeWav(channels, fileState.decoded.sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus(`Preview ready for normalized.wav with ${gain}× gain${normalize ? " and peak normalization" : ""}.`);
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "normalized.wav");
    fileState.setStatus(`Downloaded normalized.wav with ${gain}× gain${normalize ? " and peak normalization" : ""}.`);
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Boost or normalize audio locally, then export the processed WAV."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <RangeField hint="1 keeps the original level." label="Gain multiplier" max="3" min="0.5" step="0.1" value={gain} onChange={setGain} />
          <label className="checkbox-row">
            <input checked={normalize} onChange={(event) => setNormalize(event.target.checked)} type="checkbox" />
            <span>Normalize peak volume before applying gain</span>
          </label>
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview audio</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} />}
    />
  );
}

export function TextToSpeechTool({ tool, ...shellProps }) {
  const [text, setText] = useState("Drift off slowly. Everything is quiet, safe, and finished for the day.");
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState("1");
  const [pitch, setPitch] = useState("1");
  const [status, setStatus] = useState("Use your browser voice locally. Nothing you type is sent to a server.");
  const [timer, setTimer] = useState({ hours: "0", minutes: "0", seconds: "0" });
  const countdown = useCountdownController();

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const syncVoices = () => {
      const nextVoices = window.speechSynthesis.getVoices().filter((voice) => voice.lang);
      setVoices(nextVoices);
      if (!voiceName && nextVoices[0]) setVoiceName(nextVoices[0].name);
    };
    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;
    return () => {
      window.speechSynthesis.cancel();
      countdown.stop();
    };
  }, [voiceName]);

  tool.copyValue = () => text;

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("Speech synthesis is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find((voice) => voice.name === voiceName);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = Number(rate) || 1;
    utterance.pitch = Number(pitch) || 1;
    utterance.onend = () => {
      countdown.stop();
      setStatus("Playback finished.");
    };
    utterance.onerror = () => {
      countdown.stop();
      setStatus("Playback could not be started.");
    };
    window.speechSynthesis.speak(utterance);
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    if (total > 0) {
      countdown.start(total, () => {
        window.speechSynthesis.cancel();
        setStatus(`Playback stopped after ${formatTimerLabel(total)}.`);
      });
    } else {
      countdown.stop();
    }
    setStatus(total ? `Speaking locally. Timer set for ${formatTimerLabel(total)}.` : "Speaking locally.");
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Type text, choose a local browser voice, and optionally stop playback with a timer."
      inputArea={
        <>
          <ToolInput label="Text"><textarea rows="10" value={text} onChange={(event) => setText(event.target.value)} /></ToolInput>
          <div className="split-fields">
            <ToolInput label="Voice">
              <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)}>
                {voices.length ? voices.map((voice) => <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>) : <option value="">Default browser voice</option>}
              </select>
            </ToolInput>
            <RangeField label="Rate" max="1.8" min="0.5" step="0.1" value={rate} onChange={setRate} />
            <RangeField label="Pitch" max="2" min="0.5" step="0.1" value={pitch} onChange={setPitch} />
          </div>
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={speak} type="button">Speak text</button>
            <button className="button button--secondary" onClick={() => { countdown.stop(); window.speechSynthesis?.cancel?.(); setStatus("Playback stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={status} countdown={<TimerCountdownPanel isActive={countdown.isActive} remainingSeconds={countdown.remainingSeconds} />} extra={<InlineMessage tone="neutral">Voice quality and available voices depend on the browser and operating system.</InlineMessage>} />}
    />
  );
}

export function AudioJoinerMergerTool({ tool, ...shellProps }) {
  const fileState = useMultiAudioFiles("Choose two or more audio files to merge into one WAV.");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = () => {
    if (fileState.decoded.length < 2) {
      fileState.setStatus("Choose at least two audio files.");
      return null;
    }
    const channelCount = Math.max(...fileState.decoded.map((item) => item.numberOfChannels));
    const sampleRate = fileState.decoded[0].sampleRate;
    const merged = mergeChannelsSequentially(
      fileState.decoded.map((item) =>
        Array.from({ length: channelCount }, (_, channelIndex) => item.channels[channelIndex] || new Float32Array(item.channels[0].length))
      )
    );
    return encodeWav(merged, sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus(`Preview ready for merged-audio.wav from ${fileState.decoded.length} files.`);
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "merged-audio.wav");
    fileState.setStatus(`Downloaded merged-audio.wav from ${fileState.decoded.length} files.`);
  };

  const items = fileState.decoded.length
    ? [
        { label: "Files", value: String(fileState.decoded.length) },
        { label: "Total duration", value: formatDuration(fileState.decoded.reduce((sum, item) => sum + item.duration, 0)) },
        { label: "Output sample rate", value: `${formatNumber(fileState.decoded[0].sampleRate)} Hz` }
      ]
    : [];

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Combine multiple decoded audio files into one sequential WAV download."
      inputArea={
        <>
          <ToolInput label="Audio files">
            <input accept="audio/*" multiple onChange={(event) => { processed.clearProcessedResult(); fileState.onFilesChange(event); }} type="file" />
          </ToolInput>
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview merge</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl} metaItems={items} />}
    />
  );
}

export function AudioSpeedChangerTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file, then change the playback speed.");
  const [speed, setSpeed] = useState("1.25");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    const channels = fileState.decoded.channels.map((channel) => resampleChannel(channel, speed));
    return encodeWav(channels, fileState.decoded.sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus(`Preview ready for speed-adjusted.wav at ${speed}× speed.`);
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "speed-adjusted.wav");
    fileState.setStatus(`Downloaded speed-adjusted.wav at ${speed}× speed.`);
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Speed audio up or slow it down locally and export the result as WAV."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <RangeField label="Speed multiplier" max="2" min="0.5" step="0.05" value={speed} onChange={setSpeed} />
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview speed</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Reset</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} />}
    />
  );
}

export function PitchChangerTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file, then shift pitch up or down.");
  const [semitones, setSemitones] = useState("2");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    const channels = fileState.decoded.channels.map((channel) => shiftPitchBySemitones(channel, semitones));
    return encodeWav(channels, fileState.decoded.sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus(`Preview ready for pitch-shifted.wav with a ${semitones} semitone shift.`);
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "pitch-shifted.wav");
    fileState.setStatus(`Downloaded pitch-shifted.wav with a ${semitones} semitone shift.`);
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Apply a simple local pitch shift. This browser-first version changes pitch by resampling, so duration changes too."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <RangeField label="Semitone shift" max="12" min="-12" step="1" value={semitones} onChange={setSemitones} />
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview pitch shift</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} extra={<InlineMessage tone="warning">This is a lightweight browser pitch shift, not a full studio-grade time-stretch algorithm.</InlineMessage>} />}
    />
  );
}

export function BpmDetectorTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file to estimate tempo locally.");
  const [bpm, setBpm] = useState(null);
  tool.copyValue = () => (bpm ? `${bpm} BPM` : fileState.status);

  const analyze = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return;
    }
    const nextBpm = estimateBpm(fileState.decoded.channels[0], fileState.decoded.sampleRate);
    setBpm(nextBpm || null);
    fileState.setStatus(nextBpm ? `Estimated tempo: ${nextBpm} BPM.` : "Could not detect a reliable tempo from this audio.");
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Estimate BPM by analyzing repeating peaks in the uploaded audio."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={fileState.onFileChange} type="file" />
          </ToolInput>
          <ActionRow>
            <button className="button" onClick={analyze} type="button">Detect BPM</button>
            <button className="button button--secondary" onClick={() => { fileState.clear(); setBpm(null); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={fileState.sourceUrl} metaItems={bpm ? [...summarizeDecoded(fileState.decoded), { label: "Estimated BPM", value: String(bpm) }] : summarizeDecoded(fileState.decoded)} />}
    />
  );
}

export function SpectrumAnalyzerTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file, then play it to see a live spectrum.");
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const contextRef = useRef(null);
  const [status, setStatus] = useState("Choose an audio file, then play it to see a live spectrum.");
  tool.copyValue = () => status;

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause?.();
      contextRef.current?.close?.().catch?.(() => {});
    },
    []
  );

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    const values = new Uint8Array(analyser.frequencyBinCount);
    const renderFrame = () => {
      analyser.getByteFrequencyData(values);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 48;
      const step = Math.floor(values.length / bars);
      const width = canvas.width / bars;
      for (let index = 0; index < bars; index += 1) {
        const value = values[index * step] || 0;
        const height = (value / 255) * canvas.height;
        ctx.fillStyle = "rgba(159, 183, 255, 0.85)";
        ctx.fillRect(index * width, canvas.height - height, Math.max(2, width - 2), height);
      }
      rafRef.current = requestAnimationFrame(renderFrame);
    };
    renderFrame();
  };

  const play = async () => {
    if (!audioRef.current || !fileState.sourceUrl) {
      setStatus("Choose an audio file first.");
      return;
    }
    if (!contextRef.current || contextRef.current.state === "closed") {
      contextRef.current = await createAudioContext();
    }
    if (!sourceRef.current) {
      sourceRef.current = contextRef.current.createMediaElementSource(audioRef.current);
      analyserRef.current = contextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(contextRef.current.destination);
    }
    if (contextRef.current.state === "suspended") await contextRef.current.resume();
    await audioRef.current.play();
    setStatus("Playing with a live frequency view.");
    draw();
  };

  const stop = () => {
    audioRef.current?.pause?.();
    cancelAnimationFrame(rafRef.current);
    setStatus("Playback paused.");
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Use a live analyzer node to inspect the frequency content of audio during playback."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { fileState.onFileChange(event); setStatus("Choose an audio file, then play it to see a live spectrum."); }} type="file" />
          </ToolInput>
          <ActionRow>
            <button className="button" onClick={play} type="button">Play and analyze</button>
            <button className="button button--secondary" onClick={stop} type="button">Pause</button>
          </ActionRow>
        </>
      }
      outputArea={
        <AudioOutput
          status={status}
          previewUrl={null}
          metaItems={summarizeDecoded(fileState.decoded)}
          extra={
            <ResultPanel title="Spectrum view">
              <div className="audio-visualizer">
                <canvas className="audio-canvas" ref={canvasRef} width="720" height="180" />
                {fileState.sourceUrl ? <audio controls className="audio-player" ref={audioRef} src={fileState.sourceUrl} /> : <pre>Choose a file to enable playback.</pre>}
              </div>
            </ResultPanel>
          }
        />
      }
    />
  );
}

function SoundGeneratorTool({ tool, color, instructions, ...shellProps }) {
  const audio = useAudioController();
  const [timer, setTimer] = useState({ hours: "0", minutes: "30", seconds: "0" });
  const [status, setStatus] = useState("Start playback to generate local noise.");
  tool.copyValue = () => status;

  const play = async () => {
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    try {
      await audio.start((context) => {
        const source = createNoiseLoop(context, color);
        const gain = context.createGain();
        gain.gain.value = 0.35;
        source.connect(gain);
        gain.connect(context.destination);
        source.start();
        return () => {
          try {
            source.stop();
          } catch {
            // Ignore double-stop cleanup.
          }
          source.disconnect();
          gain.disconnect();
        };
      }, total);
      setStatus(total ? `Playing ${color} noise. Timer set for ${formatTimerLabel(total)}.` : `Playing ${color} noise continuously.`);
    } catch (error) {
      setStatus(error.message || "Playback could not be started.");
    }
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions={instructions}
      inputArea={
        <>
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={play} type="button">Start playback</button>
            <button className="button button--secondary" onClick={() => { audio.stop(); setStatus("Playback stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={status} countdown={<TimerCountdownPanel isActive={audio.timerActive} remainingSeconds={audio.remainingSeconds} />} extra={<SoundGeneratorNotes color={color} />} />}
    />
  );
}

export function ToneGeneratorTool({ tool, ...shellProps }) {
  const audio = useAudioController();
  const [frequency, setFrequency] = useState("432");
  const [wave, setWave] = useState("sine");
  const [timer, setTimer] = useState({ hours: "0", minutes: "15", seconds: "0" });
  const [status, setStatus] = useState("Generate a steady test tone locally in your browser.");
  tool.copyValue = () => status;

  const play = async () => {
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    try {
      await audio.start((context) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = wave;
        oscillator.frequency.value = Number(frequency) || 440;
        gain.gain.value = 0.18;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        return () => {
          try {
            oscillator.stop();
          } catch {
            // Ignore duplicate stop calls.
          }
          oscillator.disconnect();
          gain.disconnect();
        };
      }, total);
      setStatus(total ? `Playing a ${frequency} Hz ${wave} tone for ${formatTimerLabel(total)}.` : `Playing a ${frequency} Hz ${wave} tone.`);
    } catch (error) {
      setStatus(error.message || "Playback could not be started.");
    }
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Generate a steady oscillator tone and optionally stop it with a timer."
      inputArea={
        <>
          <div className="split-fields">
            <ToolInput label="Frequency (Hz)">
              <input max="2000" min="20" type="number" value={frequency} onChange={(event) => setFrequency(event.target.value)} />
            </ToolInput>
            <ToolInput label="Waveform">
              <select value={wave} onChange={(event) => setWave(event.target.value)}>
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Sawtooth</option>
              </select>
            </ToolInput>
          </div>
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={play} type="button">Start tone</button>
            <button className="button button--secondary" onClick={() => { audio.stop(); setStatus("Tone stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={status} countdown={<TimerCountdownPanel isActive={audio.timerActive} remainingSeconds={audio.remainingSeconds} />} metaItems={[{ label: "Frequency", value: `${frequency} Hz` }, { label: "Waveform", value: wave }]} />}
    />
  );
}

export function WhiteNoiseGeneratorTool(props) {
  return <SpectralNoiseTool {...props} familyKey="white" instructions="Generate white noise locally with an optional playback timer and bounded spectral customization." />;
}

export function PinkNoiseGeneratorTool(props) {
  return <SpectralNoiseTool {...props} familyKey="pink" instructions="Generate pink noise locally with an optional playback timer and bounded spectral customization." />;
}

export function BrownNoiseGeneratorTool(props) {
  return <SpectralNoiseTool {...props} familyKey="brown" instructions="Generate brown noise locally with an optional playback timer and bounded spectral customization." />;
}

export function BlueNoiseGeneratorTool(props) {
  return <SpectralNoiseTool {...props} familyKey="blue" instructions="Generate blue noise locally with an optional playback timer and bounded spectral customization." />;
}

export function VioletNoiseGeneratorTool(props) {
  return <SpectralNoiseTool {...props} familyKey="violet" instructions="Generate violet noise locally with an optional playback timer and bounded spectral customization." />;
}

export function BlackNoiseGeneratorTool(props) {
  return <SpectralNoiseTool {...props} familyKey="black" instructions="Generate black-leaning noise locally with an optional playback timer and bounded spectral customization." />;
}

export function AmbientSoundMixerTool({ tool, ...shellProps }) {
  const audio = useAudioController();
  const [timer, setTimer] = useState({ hours: "3", minutes: "0", seconds: "0" });
  const [levels, setLevels] = useState({ rain: "0.45", wind: "0.2", ocean: "0.25", fan: "0.15" });
  const [status, setStatus] = useState("Blend a few lightweight ambient textures locally.");
  tool.copyValue = () => status;

  const play = async () => {
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    try {
      await audio.start((context) => {
        const rain = createNoiseLoop(context, "white");
        const rainFilter = context.createBiquadFilter();
        rainFilter.type = "highpass";
        rainFilter.frequency.value = 900;
        const rainGain = context.createGain();
        rainGain.gain.value = Number(levels.rain);

        const wind = createNoiseLoop(context, "brown");
        const windFilter = context.createBiquadFilter();
        windFilter.type = "lowpass";
        windFilter.frequency.value = 350;
        const windGain = context.createGain();
        windGain.gain.value = Number(levels.wind);

        const ocean = createNoiseLoop(context, "pink");
        const oceanFilter = context.createBiquadFilter();
        oceanFilter.type = "bandpass";
        oceanFilter.frequency.value = 640;
        oceanFilter.Q.value = 0.7;
        const oceanGain = context.createGain();
        oceanGain.gain.value = Number(levels.ocean);

        const fan = createNoiseLoop(context, "white");
        const fanFilter = context.createBiquadFilter();
        fanFilter.type = "lowpass";
        fanFilter.frequency.value = 1300;
        const fanGain = context.createGain();
        fanGain.gain.value = Number(levels.fan);

        rain.connect(rainFilter).connect(rainGain).connect(context.destination);
        wind.connect(windFilter).connect(windGain).connect(context.destination);
        ocean.connect(oceanFilter).connect(oceanGain).connect(context.destination);
        fan.connect(fanFilter).connect(fanGain).connect(context.destination);
        [rain, wind, ocean, fan].forEach((source) => source.start());

        return () => {
          [rain, wind, ocean, fan].forEach((source) => {
            try {
              source.stop();
            } catch {
              // Ignore duplicate stop calls.
            }
            source.disconnect();
          });
          [rainFilter, windFilter, oceanFilter, fanFilter, rainGain, windGain, oceanGain, fanGain].forEach((node) => node.disconnect());
        };
      }, total);
      setStatus(total ? `Ambient mix started. Timer set for ${formatTimerLabel(total)}.` : "Ambient mix started.");
    } catch (error) {
      setStatus(error.message || "Ambient playback could not be started.");
    }
  };

  const slider = (label, key) => (
      <RangeField label={label} max="0.8" min="0" step="0.05" value={levels[key]} onChange={(next) => setLevels((current) => ({ ...current, [key]: next }))} />
  );

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Mix a few synthetic ambient textures entirely in the browser and stop them with an optional timer."
      inputArea={
        <>
          {slider("Rain texture", "rain")}
          {slider("Wind texture", "wind")}
          {slider("Ocean texture", "ocean")}
          {slider("Fan texture", "fan")}
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={play} type="button">Start ambient mix</button>
            <button className="button button--secondary" onClick={() => { audio.stop(); setStatus("Ambient mix stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={status} countdown={<TimerCountdownPanel isActive={audio.timerActive} remainingSeconds={audio.remainingSeconds} />} metaItems={Object.entries(levels).map(([key, value]) => ({ label: key, value }))} />}
    />
  );
}

export function MetronomeTool({ tool, ...shellProps }) {
  const audio = useAudioController();
  const [bpm, setBpm] = useState("90");
  const [beatsPerBar, setBeatsPerBar] = useState("4");
  const [timer, setTimer] = useState({ hours: "0", minutes: "30", seconds: "0" });
  const [status, setStatus] = useState("Start the metronome when you are ready to practice.");
  tool.copyValue = () => status;

  const play = async () => {
    const total = computeTimerSeconds(timer.hours, timer.minutes, timer.seconds);
    try {
      await audio.start((context) => {
        let beat = 0;
        const click = () => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = beat % Number(beatsPerBar || 4) === 0 ? 1100 : 850;
          gain.gain.value = 0.18;
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.05);
          beat += 1;
        };
        click();
        const interval = window.setInterval(click, 60000 / Math.max(20, Number(bpm) || 90));
        return () => {
          window.clearInterval(interval);
        };
      }, total);
      setStatus(total ? `Metronome running at ${bpm} BPM for ${formatTimerLabel(total)}.` : `Metronome running at ${bpm} BPM.`);
    } catch (error) {
      setStatus(error.message || "Metronome could not be started.");
    }
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Generate a local metronome click track and optionally stop it with a timer."
      inputArea={
        <>
          <div className="split-fields">
            <ToolInput label="BPM">
              <input max="220" min="20" type="number" value={bpm} onChange={(event) => setBpm(event.target.value)} />
            </ToolInput>
            <ToolInput label="Beats per bar">
              <input max="12" min="1" type="number" value={beatsPerBar} onChange={(event) => setBeatsPerBar(event.target.value)} />
            </ToolInput>
          </div>
          <TimerSection timer={timer} setTimer={setTimer} />
          <ActionRow>
            <button className="button" onClick={play} type="button">Start metronome</button>
            <button className="button button--secondary" onClick={() => { audio.stop(); setStatus("Metronome stopped."); }} type="button">Stop</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={status} countdown={<TimerCountdownPanel isActive={audio.timerActive} remainingSeconds={audio.remainingSeconds} />} metaItems={[{ label: "BPM", value: bpm }, { label: "Beats per bar", value: beatsPerBar }]} />}
    />
  );
}

export function SilenceRemoverTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file to remove long silent sections.");
  const [threshold, setThreshold] = useState("0.02");
  const [minimum, setMinimum] = useState("0.3");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    const channels = fileState.decoded.channels.map((channel) => removeSilence(channel, fileState.decoded.sampleRate, Number(threshold), Number(minimum)));
    return encodeWav(channels, fileState.decoded.sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus(`Preview ready for silence-removed.wav using a threshold of ${threshold}.`);
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "silence-removed.wav");
    fileState.setStatus(`Downloaded silence-removed.wav using a threshold of ${threshold}.`);
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Scan for low-amplitude regions and remove longer silent windows locally in the browser."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <div className="split-fields">
            <RangeField label="Silence threshold" max="0.1" min="0.005" step="0.005" value={threshold} onChange={setThreshold} />
            <ToolInput label="Minimum silence (seconds)">
              <input min="0.1" step="0.1" type="number" value={minimum} onChange={(event) => setMinimum(event.target.value)} />
            </ToolInput>
          </div>
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview cleaned audio</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} />}
    />
  );
}

export function AudioFadeTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file to add fade-in or fade-out.");
  const [fadeIn, setFadeIn] = useState("1");
  const [fadeOut, setFadeOut] = useState("1");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    const channels = fileState.decoded.channels.map((channel) => applyFade(channel, fileState.decoded.sampleRate, fadeIn, fadeOut));
    return encodeWav(channels, fileState.decoded.sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus(`Preview ready for faded-audio.wav with ${fadeIn}s fade-in and ${fadeOut}s fade-out.`);
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "faded-audio.wav");
    fileState.setStatus(`Downloaded faded-audio.wav with ${fadeIn}s fade-in and ${fadeOut}s fade-out.`);
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Apply simple gain ramps at the start and end of your audio locally."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <div className="split-fields">
            <ToolInput label="Fade in (seconds)">
              <input min="0" step="0.1" type="number" value={fadeIn} onChange={(event) => setFadeIn(event.target.value)} />
            </ToolInput>
            <ToolInput label="Fade out (seconds)">
              <input min="0" step="0.1" type="number" value={fadeOut} onChange={(event) => setFadeOut(event.target.value)} />
            </ToolInput>
          </div>
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview fade</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Reset</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} />}
    />
  );
}

export function BasicEqualizerTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file to apply a simple 3-band EQ.");
  const [low, setLow] = useState("2");
  const [mid, setMid] = useState("0");
  const [high, setHigh] = useState("3");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = async () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    if (typeof window === "undefined" || !window.OfflineAudioContext) {
      fileState.setStatus("Offline audio rendering is not available in this browser.");
      return null;
    }
    const context = new window.OfflineAudioContext(
      fileState.decoded.numberOfChannels,
      fileState.decoded.buffer.length,
      fileState.decoded.sampleRate
    );
    const source = context.createBufferSource();
    const buffer = context.createBuffer(fileState.decoded.numberOfChannels, fileState.decoded.buffer.length, fileState.decoded.sampleRate);
    fileState.decoded.channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
    source.buffer = buffer;

    const lowShelf = context.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 240;
    lowShelf.gain.value = Number(low);

    const midPeak = context.createBiquadFilter();
    midPeak.type = "peaking";
    midPeak.frequency.value = 1000;
    midPeak.Q.value = 0.9;
    midPeak.gain.value = Number(mid);

    const highShelf = context.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 3200;
    highShelf.gain.value = Number(high);

    source.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(context.destination);
    source.start();
    const rendered = await context.startRendering();
    return encodeWav(audioBufferToChannels(rendered), rendered.sampleRate);
  };

  const preview = async () => {
    const blob = await buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus("Preview ready for equalized.wav.");
  };

  const download = async () => {
    const blob = processed.processedBlob || await buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "equalized.wav");
    fileState.setStatus("Downloaded equalized.wav.");
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Apply a practical 3-band EQ with browser-native filters and export the result as WAV."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <div className="split-fields">
            <RangeField label="Low shelf (dB)" max="12" min="-12" step="1" value={low} onChange={setLow} />
            <RangeField label="Mid peak (dB)" max="12" min="-12" step="1" value={mid} onChange={setMid} />
            <RangeField label="High shelf (dB)" max="12" min="-12" step="1" value={high} onChange={setHigh} />
          </div>
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview EQ</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} />}
    />
  );
}

export function KaraokeVocalRemoverTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose a stereo audio file to try simple center-channel cancellation.");
  const processed = useProcessedAudioResult();
  tool.copyValue = () => fileState.status;

  const buildProcessedBlob = () => {
    if (!fileState.decoded) {
      fileState.setStatus("Choose an audio file first.");
      return null;
    }
    if (fileState.decoded.numberOfChannels < 2) {
      fileState.setStatus("This tool works best on stereo audio.");
      return null;
    }
    const removed = centerCancel(fileState.decoded.channels[0], fileState.decoded.channels[1]);
    return encodeWav([removed, removed], fileState.decoded.sampleRate);
  };

  const preview = () => {
    const blob = buildProcessedBlob();
    if (!blob) return;
    processed.setProcessedResult(blob);
    fileState.setStatus("Preview ready for karaoke.wav with center cancellation.");
  };

  const download = () => {
    const blob = processed.processedBlob || buildProcessedBlob();
    if (!blob) return;
    if (!processed.processedBlob) processed.setProcessedResult(blob);
    downloadBlob(blob, "karaoke.wav");
    fileState.setStatus("Downloaded karaoke.wav with center cancellation.");
  };

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Use simple left-right phase cancellation to reduce centered vocals in some stereo mixes."
      inputArea={
        <>
          <ToolInput label="Audio file">
            <input accept="audio/*" onChange={(event) => { processed.clearProcessedResult(); fileState.onFileChange(event); }} type="file" />
          </ToolInput>
          <ActionRow>
            <button className="button" onClick={preview} type="button">Preview karaoke mix</button>
            <button className="button button--secondary" onClick={download} type="button">Download WAV</button>
            <button className="button button--secondary" onClick={() => { processed.clearProcessedResult(); fileState.clear(); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<AudioOutput status={fileState.status} previewUrl={processed.previewUrl || fileState.sourceUrl} metaItems={summarizeDecoded(fileState.decoded)} extra={<InlineMessage tone="warning">Results vary a lot by mix. This works best on stereo tracks with centered vocals and wide backing instruments.</InlineMessage>} />}
    />
  );
}

export function WaveformVisualizerTool({ tool, ...shellProps }) {
  const fileState = useSingleAudioFile("Choose an audio file to render its waveform peaks.");
  const peaks = useMemo(() => (fileState.decoded ? computeWaveformPeaks(fileState.decoded.channels[0], 96) : []), [fileState.decoded]);
  tool.copyValue = () => fileState.status;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Render a quick waveform overview from the uploaded audio without sending it anywhere."
      inputArea={<ToolInput label="Audio file"><input accept="audio/*" onChange={fileState.onFileChange} type="file" /></ToolInput>}
      outputArea={
        <AudioOutput
          status={fileState.status}
          previewUrl={fileState.sourceUrl}
          metaItems={summarizeDecoded(fileState.decoded)}
          extra={
            <ResultPanel title="Waveform">
              {peaks.length ? (
                <div className="waveform-bars">
                  {peaks.map((peak, index) => (
                    <span className="waveform-bars__bar" key={`${index}-${peak}`} style={{ height: `${Math.max(6, peak * 100)}%` }} />
                  ))}
                </div>
              ) : (
                <pre>Choose an audio file to render waveform peaks.</pre>
              )}
            </ResultPanel>
          }
        />
      }
    />
  );
}
