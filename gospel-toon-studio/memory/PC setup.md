---
tags: [gospel-toon-studio, setup]
---
# PC setup
Back to [Gospel Toon Studio](Gospel%20Toon%20Studio.md)

- Windows, NVIDIA RTX 4060 (8 GB), 32 GB RAM, 2 TB drive. User folder `C:\Users\immar`.
- Installed: Python 3.11 (`py -3.11`), Node.js, ffmpeg, Git, Claude Code, Chrome, Claude desktop app, Obsidian
  (vault tools on `D:\Obsidian`).
- PowerShell scripts allowed (`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).
- ComfyUI Desktop (local instance, port 8188), Manager enabled via `--enable-manager`. Models in
  `%LOCALAPPDATA%\Comfy-Desktop\ComfyUI-Shared\models`. Installed: WanVideoWrapper, VideoHelperSuite, Wan 2.1 1.3B
  T2V + umt5 + Wan VAE; SDXL base (`checkpoints\sd_xl_base_1.0.safetensors`).
- Studio `.env`: `COMFYUI_URL=http://127.0.0.1:8188`, `REMOTION_BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe`
  (Remotion could not download its own browser).
- Unreal Engine 5.8 via the Epic Games Launcher. See [Unreal plan](Unreal%20plan.md).
