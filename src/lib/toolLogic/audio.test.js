import { describe, expect, it } from "vitest";
import {
  applyFade,
  alphaToSlopeDbPerOctave,
  centerCancel,
  computeTimerSeconds,
  computeWaveformPeaks,
  createNoiseSamples,
  describeSpectralNoise,
  detectSilenceWindows,
  encodeWav,
  estimateBpm,
  formatDigitalCountdown,
  formatTimerLabel,
  mergeChannelsSequentially,
  removeSilence
} from "./audio";

describe("audio tool logic", () => {
  const roundList = (items) => items.map((value) => Number(value.toFixed(3)));

  it("formats timer values predictably", () => {
    expect(computeTimerSeconds(3, 0, 0)).toBe(10800);
    expect(formatTimerLabel(3665)).toBe("1h 1m 5s");
    expect(formatDigitalCountdown(3665)).toBe("01:01:05");
    expect(alphaToSlopeDbPerOctave(1)).toBe(-3);
    expect(describeSpectralNoise(0)).toMatchObject({ canonical: true, displayName: "White Noise", slope: 0 });
    expect(describeSpectralNoise(1)).toMatchObject({ canonical: true, displayName: "Pink Noise", slope: -3 });
    expect(describeSpectralNoise(2)).toMatchObject({ canonical: true, displayName: "Brown Noise", slope: -6 });
    expect(describeSpectralNoise(0.5)).toMatchObject({
      canonical: false,
      displayName: "Rose Mist Blend",
      technicalLabel: "Custom blend between white and pink",
      slope: -1.5
    });
  });

  it("encodes wav output and computes waveform peaks", async () => {
    const blob = encodeWav([new Float32Array([0, 0.5, -0.5, 0])], 44100);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBeGreaterThan(44);
    expect(roundList(computeWaveformPeaks(new Float32Array([0, 0.5, -0.3, 0.2]), 2))).toEqual([0.5, 0.3]);
    await expect(blob.arrayBuffer()).resolves.toBeInstanceOf(ArrayBuffer);
  });

  it("merges buffers, applies fades, and removes silence windows", () => {
    const merged = mergeChannelsSequentially([
      [new Float32Array([0.1, 0.2])],
      [new Float32Array([0.3])]
    ]);
    expect(roundList(Array.from(merged[0]))).toEqual([0.1, 0.2, 0.3]);

    const faded = applyFade(new Float32Array([1, 1, 1, 1]), 4, 0.5, 0.5);
    expect(faded[0]).toBe(0);
    expect(faded[3]).toBeGreaterThanOrEqual(0);

    const windows = detectSilenceWindows(new Float32Array([0, 0, 0.5, 0, 0]), 10, 0.1, 0.2);
    expect(windows).toEqual([{ start: 0, end: 2 }, { start: 3, end: 5 }]);

    const trimmed = removeSilence(new Float32Array([0, 0, 0.5, 0, 0]), 10, 0.1, 0.2);
    expect(Array.from(trimmed)).toEqual([0.5]);
  });

  it("estimates bpm and supports center cancellation plus noise creation", () => {
    const channel = new Float32Array(44100 * 4);
    for (let second = 0; second < 4; second += 1) {
      channel[second * 44100] = 1;
    }
    expect(estimateBpm(channel, 44100)).toBeCloseTo(60, -1);
    expect(Array.from(centerCancel(new Float32Array([1, 0.5]), new Float32Array([0.5, 0.25])))).toEqual([0.5, 0.25]);
    expect(createNoiseSamples("pink", 128)).toHaveLength(128);
  });
});
