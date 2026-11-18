# ComfyUI workflow for B-roll

1. On your GPU machine, install ComfyUI and the WanVideoWrapper custom nodes
   (your fork: `ryanratliff44/comfyui-wanvideowrapper` → `ComfyUI/custom_nodes/`).
2. Load a text-to-video example, e.g. `example_workflows/wanvideo_2_1_14B_T2V_example_03.json`
   (or the 1.3B one on smaller GPUs), and make sure it renders one clip.
3. Settings → enable Dev mode, then **Workflow → Export (API)**. Save it here as `wan_t2v_api.json`.
4. `tools/broll.py` fills in the prompt, negative prompt, seed and size for every shot.

Tips: generate at 480×832 (9:16) and let the editor scale up; reuse one seed per scene for a
consistent look; if you train or download a cartoon-style LoRA, add it to the workflow before export.
For image-to-video (best character consistency), make one keyframe per shot, then export an I2V
workflow instead.
