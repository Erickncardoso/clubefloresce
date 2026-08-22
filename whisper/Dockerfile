# Clube Florescer — Whisper STT self-hosted (Speaches + faster-whisper, CPU)
#
# Coolify:
#   Base Directory: whisper
#   Dockerfile: Dockerfile
#   Porta exposta: 8000
#   Domínio: opcional (recomendado só rede interna; backend usa WHISPER_API_BASE)
#
# RAM: medium ~4–6 GB em pico (CPU). Defina limits_memory no Coolify se precisar.

FROM ghcr.io/speaches-ai/speaches:latest-cpu

ENV WHISPER__MODEL=Systran/faster-whisper-medium
ENV WHISPER__INFERENCE_DEVICE=cpu

EXPOSE 8000
