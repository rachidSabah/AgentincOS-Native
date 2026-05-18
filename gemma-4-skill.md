---
name: gemma-4-optimization-integration
description: Optimize Gemma 4 inference and integrate with local agent workflows.
version: 1.0.0
author: Google AI Edge Community
tags: [gemma4, optimization, ollama, vllm, integration]
---

# Gemma 4 Optimization & Integration

Use this skill to configure, optimize, and integrate Gemma 4 models for local agentic workflows.

## Model Selection Matrix
- **E2B (Effective 2B):** Ultra-lightweight. Use for IoT and mobile edge devices (<1.5GB RAM).
- **E4B (Effective 4B):** Balanced. Ideal for mobile agents and basic coding tasks.
- **26B MoE:** High performance. Best for mid-tier GPUs (RTX 3060/4060) with fast inference.
- **31B Dense:** Frontier quality. Use for complex reasoning and deep technical synthesis (24GB+ VRAM).

## Optimization Procedures

### 1. Quantization Tuning
For local inference via Ollama, use the following quantization targets:
- **Default:** `Q4_K_M` (Best balance of quality/memory).
- **High Precision:** `Q8_0` (Minimal loss, requires ~32GB VRAM for 31B).
- **Low Memory:** `IQ3_M` (For 26B MoE on 16GB VRAM cards).

### 2. Inference Engine Flags
When running via `vLLM` or `llama.cpp`, apply these optimizations:
- `--enable-kv-sharing`: Reduces memory footprint by sharing KV cache across layers.
- `--tool-call-parser gemma4`: Enables native structured output parsing.
- `--image-max-tokens 1120`: (Multimodal) Maximizes OCR and detail extraction accuracy.

## Integration Workflow
1. **Discovery:** Identify the hardware constraints (VRAM/RAM).
2. **Pull:** Execute `ollama pull gemma4:<tag>` based on the matrix above.
3. **Connect:** Update `config.yaml` in OpenClaw or Gemini CLI to point to the local endpoint.
4. **Verify:** Run a test tool-call to ensure JSON schema compliance.

## Validation
- Ensure the model returns valid JSON for function calls.
- Check latency: E4B should decode at >30 tokens/sec on modern hardware.
