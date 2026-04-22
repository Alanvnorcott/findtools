function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function secondsToSamples(seconds, sampleRate) {
  return Math.max(0, Math.round((Number(seconds) || 0) * sampleRate));
}

export function formatTimerLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours) return `${hours}h ${minutes}m ${remainder}s`;
  if (minutes) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

export function formatDigitalCountdown(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const remainder = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${remainder}`;
}

export function alphaToSlopeDbPerOctave(alpha) {
  return -3 * (Number(alpha) || 0);
}

export function describeSpectralNoise(alpha) {
  const value = Number(alpha) || 0;
  const slope = alphaToSlopeDbPerOctave(value);
  const roundedAlpha = Number(value.toFixed(2));
  const roundedSlope = Number(slope.toFixed(2));
  const closeTo = (target, tolerance = 0.12) => Math.abs(value - target) <= tolerance;

  if (closeTo(-2)) {
    return {
      canonical: true,
      displayName: "Violet Noise",
      technicalLabel: "High-frequency weighted",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  if (closeTo(-1)) {
    return {
      canonical: true,
      displayName: "Blue Noise",
      technicalLabel: "High-frequency rising",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  if (closeTo(0)) {
    return {
      canonical: true,
      displayName: "White Noise",
      technicalLabel: "Flat spectrum",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  if (closeTo(1)) {
    return {
      canonical: true,
      displayName: "Pink Noise",
      technicalLabel: "Equal energy per octave",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  if (closeTo(2)) {
    return {
      canonical: true,
      displayName: "Brown Noise",
      technicalLabel: "Low-frequency weighted",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  if (value > 2) {
    return {
      canonical: false,
      displayName: "Black-Leaning Noise",
      technicalLabel: "Custom extra-dark spectral tilt",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  if (value < -2) {
    return {
      canonical: false,
      displayName: "Ultra-Violet-Leaning Noise",
      technicalLabel: "Custom extra-bright spectral tilt",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  if (value > 1) {
    return {
      canonical: false,
      displayName: value >= 1.5 ? "Chestnut Blend" : "Dusty Rose Blend",
      technicalLabel: "Custom blend between pink and brown",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  if (value > 0) {
    return {
      canonical: false,
      displayName: value >= 0.5 ? "Rose Mist Blend" : "Pearl Blend",
      technicalLabel: "Custom blend between white and pink",
      alpha: roundedAlpha,
      slope: roundedSlope
    };
  }

  return {
    canonical: false,
    displayName: value >= -1 ? "Ice Blue Blend" : "Electric Violet Blend",
    technicalLabel: "Custom blend on the white-to-violet side",
    alpha: roundedAlpha,
    slope: roundedSlope
  };
}

export function interleaveChannels(channels) {
  if (!Array.isArray(channels) || !channels.length) return new Float32Array();
  if (channels.length === 1) return new Float32Array(channels[0]);
  const length = channels[0].length;
  const output = new Float32Array(length * channels.length);
  for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
      output[sampleIndex * channels.length + channelIndex] = channels[channelIndex][sampleIndex] || 0;
    }
  }
  return output;
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function encodeWav(channelData, sampleRate) {
  const channels = Array.isArray(channelData) ? channelData : [channelData];
  const interleaved = interleaveChannels(channels);
  const bytesPerSample = 2;
  const blockAlign = channels.length * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let index = 0; index < interleaved.length; index += 1) {
    const sample = clamp(interleaved[index], -1, 1);
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function applyGain(channel, gain = 1) {
  const multiplier = Number(gain) || 1;
  return Float32Array.from(channel, (sample) => clamp(sample * multiplier, -1, 1));
}

export function normalizeChannel(channel, targetPeak = 0.95) {
  const peak = channel.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  if (!peak) return Float32Array.from(channel);
  return applyGain(channel, targetPeak / peak);
}

export function applyFade(channel, sampleRate, fadeInSeconds = 0, fadeOutSeconds = 0) {
  const output = Float32Array.from(channel);
  const fadeInSamples = Math.min(output.length, secondsToSamples(fadeInSeconds, sampleRate));
  const fadeOutSamples = Math.min(output.length, secondsToSamples(fadeOutSeconds, sampleRate));

  for (let index = 0; index < fadeInSamples; index += 1) {
    output[index] *= index / Math.max(fadeInSamples, 1);
  }

  for (let index = 0; index < fadeOutSamples; index += 1) {
    const position = output.length - fadeOutSamples + index;
    if (position >= 0) {
      output[position] *= (fadeOutSamples - index) / Math.max(fadeOutSamples, 1);
    }
  }

  return output;
}

export function trimChannel(channel, sampleRate, startSeconds, endSeconds) {
  const start = clamp(secondsToSamples(startSeconds, sampleRate), 0, channel.length);
  const end = clamp(secondsToSamples(endSeconds, sampleRate), start, channel.length);
  return channel.slice(start, end);
}

export function mergeChannelsSequentially(buffers) {
  if (!buffers.length) return [];
  const channelCount = buffers[0].length;
  return Array.from({ length: channelCount }, (_, channelIndex) => {
    const totalLength = buffers.reduce((sum, buffer) => sum + (buffer[channelIndex]?.length || 0), 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      const channel = buffer[channelIndex] || new Float32Array();
      merged.set(channel, offset);
      offset += channel.length;
    }
    return merged;
  });
}

export function resampleChannel(channel, factor) {
  const speed = Math.max(0.25, Math.min(4, Number(factor) || 1));
  const length = Math.max(1, Math.round(channel.length / speed));
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const source = index * speed;
    const left = Math.floor(source);
    const right = Math.min(channel.length - 1, left + 1);
    const blend = source - left;
    output[index] = (channel[left] || 0) * (1 - blend) + (channel[right] || 0) * blend;
  }
  return output;
}

export function shiftPitchBySemitones(channel, semitones) {
  const ratio = 2 ** ((Number(semitones) || 0) / 12);
  return resampleChannel(channel, ratio);
}

export function computeWaveformPeaks(channel, buckets = 120) {
  const safeBuckets = Math.max(1, Number(buckets) || 120);
  const window = Math.max(1, Math.floor(channel.length / safeBuckets));
  return Array.from({ length: safeBuckets }, (_, index) => {
    const start = index * window;
    const end = Math.min(channel.length, start + window);
    let peak = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      peak = Math.max(peak, Math.abs(channel[sampleIndex] || 0));
    }
    return peak;
  });
}

export function estimateBpm(channel, sampleRate) {
  if (!channel.length || !sampleRate) return 0;
  const step = Math.max(1, Math.floor(sampleRate * 0.02));
  const envelope = [];
  for (let index = 0; index < channel.length; index += step) {
    let sum = 0;
    const end = Math.min(channel.length, index + step);
    for (let cursor = index; cursor < end; cursor += 1) {
      sum += Math.abs(channel[cursor] || 0);
    }
    envelope.push(sum / Math.max(1, end - index));
  }
  const max = envelope.reduce((peak, value) => Math.max(peak, value), 0);
  if (!max) return 0;
  const threshold = max * 0.7;
  const peaks = [];
  for (let index = 1; index < envelope.length - 1; index += 1) {
    if (envelope[index] > threshold && envelope[index] >= envelope[index - 1] && envelope[index] >= envelope[index + 1]) {
      peaks.push(index);
    }
  }
  if (peaks.length < 2) return 0;
  const intervals = [];
  for (let index = 1; index < peaks.length; index += 1) {
    intervals.push((peaks[index] - peaks[index - 1]) * step / sampleRate);
  }
  const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  if (!average) return 0;
  return Math.round(60 / average);
}

export function detectSilenceWindows(channel, sampleRate, threshold = 0.02, minimumSeconds = 0.3) {
  const minimumSamples = secondsToSamples(minimumSeconds, sampleRate);
  const windows = [];
  let currentStart = null;
  for (let index = 0; index < channel.length; index += 1) {
    if (Math.abs(channel[index]) <= threshold) {
      if (currentStart === null) currentStart = index;
    } else if (currentStart !== null) {
      if (index - currentStart >= minimumSamples) {
        windows.push({ start: currentStart, end: index });
      }
      currentStart = null;
    }
  }
  if (currentStart !== null && channel.length - currentStart >= minimumSamples) {
    windows.push({ start: currentStart, end: channel.length });
  }
  return windows;
}

export function removeSilence(channel, sampleRate, threshold = 0.02, minimumSeconds = 0.3) {
  const windows = detectSilenceWindows(channel, sampleRate, threshold, minimumSeconds);
  if (!windows.length) return Float32Array.from(channel);
  const keep = [];
  let cursor = 0;
  for (const window of windows) {
    if (window.start > cursor) {
      keep.push(channel.slice(cursor, window.start));
    }
    cursor = window.end;
  }
  if (cursor < channel.length) keep.push(channel.slice(cursor));
  const total = keep.reduce((sum, segment) => sum + segment.length, 0);
  const output = new Float32Array(total);
  let offset = 0;
  for (const segment of keep) {
    output.set(segment, offset);
    offset += segment.length;
  }
  return output;
}

export function centerCancel(left, right) {
  const length = Math.min(left.length, right.length);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    output[index] = clamp((left[index] || 0) - (right[index] || 0), -1, 1);
  }
  return output;
}

export function createNoiseSamples(color, length) {
  const total = Math.max(1, Number(length) || 1);
  const output = new Float32Array(total);
  let brown = 0;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let index = 0; index < total; index += 1) {
    const white = Math.random() * 2 - 1;
    if (color === "white") {
      output[index] = white * 0.4;
      continue;
    }
    if (color === "brown") {
      brown = (brown + 0.02 * white) / 1.02;
      output[index] = clamp(brown * 3.5, -1, 1);
      continue;
    }
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    output[index] = clamp(pink * 0.08, -1, 1);
  }

  return output;
}

export function computeTimerSeconds(hours, minutes, seconds) {
  return Math.max(0, Number(hours) || 0) * 3600 + Math.max(0, Number(minutes) || 0) * 60 + Math.max(0, Number(seconds) || 0);
}
