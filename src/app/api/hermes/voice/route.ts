import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, unlinkSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  hermesFetchQueued,
  findHermesBinaryAsync,
  getHermesConfig,
  getHermesApiEndpointCached,
  isHermesRunning,
  HERMES_DATA_DIR,
} from "@/lib/hermes";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceConfigResponse {
  tts: {
    provider: string | null;
    available: string[];
  };
  stt: {
    provider: string | null;
    available: string[];
  };
}

interface TTSRequest {
  text: string;
  provider?: string;
  voice?: string;
}

interface STTRequest {
  action: "transcribe";
  audio: string; // base64-encoded
  provider?: string;
  format?: string;
}

// ---------------------------------------------------------------------------
// Known providers
// ---------------------------------------------------------------------------

const KNOWN_TTS_PROVIDERS = [
  "edge-tts",
  "elevenlabs",
  "openai",
  "minimax",
  "neutts",
];

const KNOWN_STT_PROVIDERS = [
  "faster-whisper",
  "groq",
  "openai",
  "mistral",
  "xai",
];

// ---------------------------------------------------------------------------
// GET — List voice configuration
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const config = getHermesConfig();
    const voiceCfg = (config.voice ?? config.tts ?? {}) as Record<string, unknown>;

    // Determine configured providers from config
    const ttsProvider =
      (voiceCfg.tts_provider as string) ??
      (voiceCfg.provider as string) ??
      null;
    const sttProvider =
      (voiceCfg.stt_provider as string) ??
      (voiceCfg.stt as string) ??
      null;

    let ttsAvailable: string[] = [];
    let sttAvailable: string[] = [];

    // Strategy 1: Try the Hermes API /v1/voice/providers
    const apiEndpoint = getHermesApiEndpointCached();
    const running = await isHermesRunning(apiEndpoint);

    if (running) {
      try {
        const res = await hermesFetchQueued("/v1/voice/providers", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.tts && Array.isArray(data.tts.available)) {
            ttsAvailable = data.tts.available;
          }
          if (data.stt && Array.isArray(data.stt.available)) {
            sttAvailable = data.stt.available;
          }
          // If the API returns provider info, prefer it
          const resolvedTts = data.tts?.provider ?? ttsProvider;
          const resolvedStt = data.stt?.provider ?? sttProvider;

          const result: VoiceConfigResponse = {
            tts: { provider: resolvedTts ?? null, available: ttsAvailable },
            stt: { provider: resolvedStt ?? null, available: sttAvailable },
          };
          return NextResponse.json(result);
        }
      } catch {
        // API failed — fall through to CLI
      }
    }

    // Strategy 2: Try CLI `hermes config get voice`
    const bin = await findHermesBinaryAsync();
    if (bin) {
      try {
        const { stdout } = await execFileAsync(bin, ["config", "get", "voice"], {
          timeout: 5000,
        });
        const output = stdout.trim();
        if (output) {
          try {
            const parsed = JSON.parse(output);
            if (parsed.tts) {
              ttsAvailable = Array.isArray(parsed.tts.available)
                ? parsed.tts.available
                : ttsAvailable;
            }
            if (parsed.stt) {
              sttAvailable = Array.isArray(parsed.stt.available)
                ? parsed.stt.available
                : sttAvailable;
            }
          } catch {
            // Not JSON — treat as plain text, fall through
          }
        }
      } catch {
        // CLI command failed — fall through
      }
    }

    // Strategy 3: Use known provider lists as fallback
    if (ttsAvailable.length === 0) {
      ttsAvailable = KNOWN_TTS_PROVIDERS;
    }
    if (sttAvailable.length === 0) {
      sttAvailable = KNOWN_STT_PROVIDERS;
    }

    const result: VoiceConfigResponse = {
      tts: { provider: ttsProvider, available: ttsAvailable },
      stt: { provider: sttProvider, available: sttAvailable },
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to retrieve voice configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Text-to-Speech or Speech-to-Text
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const action = body.action as string | undefined;

  // Route to transcribe if action is "transcribe"
  if (action === "transcribe") {
    return handleTranscribe(body);
  }

  // Otherwise, default to TTS
  return handleTTS(body);
}

// ---------------------------------------------------------------------------
// TTS handler
// ---------------------------------------------------------------------------

async function handleTTS(body: Record<string, unknown>) {
  const text = body.text as string | undefined;
  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'text' field" },
      { status: 400 },
    );
  }

  const provider = body.provider as string | undefined;
  const voice = body.voice as string | undefined;

  // Strategy 1: Try Hermes API /v1/voice/tts
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  if (running) {
    try {
      const payload: Record<string, unknown> = { text };
      if (provider) payload.provider = provider;
      if (voice) payload.voice = voice;

      const upstream = await hermesFetchQueued("/v1/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (upstream.ok) {
        const contentType = upstream.headers.get("content-type") ?? "";

        // If the response is JSON (e.g. contains base64 audio), forward as JSON
        if (contentType.includes("application/json")) {
          const data = await upstream.json();
          return NextResponse.json(data);
        }

        // If the response is binary audio data, stream it directly
        if (upstream.body) {
          const audioBuffer = await upstream.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              "Content-Type": contentType || "audio/mpeg",
              "Cache-Control": "no-cache",
            },
          });
        }
      }

      // API returned non-OK — fall through to CLI
    } catch {
      // API failed — fall through to CLI
    }
  }

  // Strategy 2: CLI fallback `hermes voice speak "text" --provider X`
  const bin = await findHermesBinaryAsync();
  if (!bin) {
    return NextResponse.json(
      {
        error: "Hermes API server is not running and CLI binary not found",
        hint: "Start Hermes with 'hermes gateway' or install the hermes CLI",
      },
      { status: 503 },
    );
  }

  try {
    const args = ["voice", "speak", text];
    if (provider) {
      args.push("--provider", provider);
    }
    if (voice) {
      args.push("--voice", voice);
    }

    const { stdout } = await execFileAsync(bin, args, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024, // 10 MB for audio data
    });

    // If stdout looks like base64, decode and return as audio
    const output = stdout.trim();
    if (output) {
      // Check if it's valid base64 audio
      try {
        const audioBuffer = Buffer.from(output, "base64");
        // Heuristic: if decoded length is reasonable for audio, return as binary
        if (audioBuffer.length > 100) {
          return new Response(audioBuffer, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-cache",
            },
          });
        }
      } catch {
        // Not valid base64 — fall through
      }

      // Return as text/JSON if we can't decode it as audio
      return NextResponse.json({ audio: output });
    }

    return NextResponse.json(
      { error: "TTS produced no output" },
      { status: 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "TTS via CLI failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// STT (transcribe) handler
// ---------------------------------------------------------------------------

async function handleTranscribe(body: Record<string, unknown>) {
  const audio = body.audio as string | undefined;
  if (!audio || typeof audio !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'audio' field (base64-encoded audio required)" },
      { status: 400 },
    );
  }

  const provider = body.provider as string | undefined;
  const format = (body.format as string) ?? "wav";

  // Strategy 1: Try Hermes API /v1/voice/stt
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  if (running) {
    try {
      const payload: Record<string, unknown> = { audio, format };
      if (provider) payload.provider = provider;

      const upstream = await hermesFetchQueued("/v1/voice/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (upstream.ok) {
        const data = await upstream.json();
        return NextResponse.json({
          text: data.text ?? data.transcription ?? "",
          confidence: data.confidence ?? data.score ?? undefined,
        });
      }

      // API returned non-OK — fall through to CLI
    } catch {
      // API failed — fall through to CLI
    }
  }

  // Strategy 2: CLI fallback — save temp file, run `hermes voice transcribe /tmp/file.wav`
  const bin = await findHermesBinaryAsync();
  if (!bin) {
    return NextResponse.json(
      {
        error: "Hermes API server is not running and CLI binary not found",
        hint: "Start Hermes with 'hermes gateway' or install the hermes CLI",
      },
      { status: 503 },
    );
  }

  let tmpDir: string | undefined;
  let tmpFile: string | undefined;

  try {
    // Create a temp directory for the audio file
    tmpDir = mkdtempSync(join(tmpdir(), "hermes-voice-"));
    const ext = format === "mp3" ? "mp3" : format === "ogg" ? "ogg" : "wav";
    tmpFile = join(tmpDir, `audio.${ext}`);

    // Decode base64 and write to temp file
    const audioBuffer = Buffer.from(audio, "base64");
    writeFileSync(tmpFile, audioBuffer);

    // Run CLI transcription
    const args = ["voice", "transcribe", tmpFile];
    if (provider) {
      args.push("--provider", provider);
    }

    const { stdout } = await execFileAsync(bin, args, {
      timeout: 30000,
    });

    const output = stdout.trim();

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(output);
      return NextResponse.json({
        text: parsed.text ?? parsed.transcription ?? output,
        confidence: parsed.confidence ?? parsed.score ?? undefined,
      });
    } catch {
      // Not JSON — return raw text
      return NextResponse.json({
        text: output,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "STT via CLI failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  } finally {
    // Clean up temp files
    try {
      if (tmpFile) unlinkSync(tmpFile);
    } catch {
      // Ignore cleanup errors
    }
    try {
      if (tmpDir) {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
