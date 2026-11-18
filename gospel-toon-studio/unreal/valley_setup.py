"""Run inside Unreal Editor (Python Editor Script Plugin):  py "C:/Users/<you>/youtube-agent-skill/gospel-toon-studio/unreal/valley_setup.py"

Turns the open level into a golden-dawn valley for David and Goliath, puts a vertical (9:16) film camera on the
ground at head height and switches the view to look through it. No flying needed.
Every step is reported in the Output Log; a step that fails is skipped, the rest still run.
"""

import unreal

eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
ues = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
log = unreal.log


def step(name, fn):
    try:
        fn()
        log(f"[GospelToon] OK   {name}")
    except Exception as e:  # keep going
        unreal.log_warning(f"[GospelToon] SKIP {name}: {e}")


def actors_of(cls):
    return [a for a in eas.get_all_level_actors() if isinstance(a, cls)]


def set_props(obj, **props):
    for k, v in props.items():
        try:
            obj.set_editor_property(k, v)
        except Exception as e:
            unreal.log_warning(f"[GospelToon]      (property {k} not set: {e})")


# 1. Low golden dawn sun
def sun():
    lights = actors_of(unreal.DirectionalLight)
    if not lights:
        lights = [eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 1000))]
    for l in lights:
        l.set_actor_rotation(unreal.Rotator(0.0, -9.0, 35.0), False)  # roll, pitch (just above horizon), yaw
        c = l.light_component
        c.set_light_color(unreal.LinearColor(1.0, 0.72, 0.45, 1.0))
        c.set_intensity(7.0)
        set_props(c, atmosphere_sun_light=True, cast_shadows=True)


# 2. Thick, glowing morning haze (the "game world" look)
def fog():
    fogs = actors_of(unreal.ExponentialHeightFog)
    if not fogs:
        fogs = [eas.spawn_actor_from_class(unreal.ExponentialHeightFog, unreal.Vector(0, 0, 0))]
    for f in fogs:
        c = f.component
        set_props(c, fog_density=0.035, fog_height_falloff=0.12, volumetric_fog=True, volumetric_fog_scattering_distribution=0.6)
        for name in ("fog_inscattering_luminance", "fog_inscattering_color"):
            try:
                c.set_editor_property(name, unreal.LinearColor(0.85, 0.62, 0.42, 1.0))
                break
            except Exception:
                pass


# 3. Soft sky light so shadows are not black
def skylight():
    sl = actors_of(unreal.SkyLight)
    if not sl:
        sl = [eas.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 500))]
    for s in sl:
        set_props(s.light_component, intensity=1.3, real_time_capture=True)


# 4. Steady exposure + warm cinematic grade, so the brightness doesn't pump between shots
def grade():
    ppv = [p for p in actors_of(unreal.PostProcessVolume) if p.get_actor_label().startswith("GospelToon")]
    p = ppv[0] if ppv else eas.spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0, 0, 0))
    p.set_actor_label("GospelToon_Grade")
    set_props(p, unbound=True)
    s = p.settings
    for k, v in dict(override_auto_exposure_method=True, auto_exposure_method=unreal.AutoExposureMethod.AEM_MANUAL,
                     override_auto_exposure_bias=True, auto_exposure_bias=11.5,
                     override_bloom_intensity=True, bloom_intensity=0.9,
                     override_vignette_intensity=True, vignette_intensity=0.45,
                     override_white_temp=True, white_temp=5600.0,
                     override_scene_fringe_intensity=True, scene_fringe_intensity=0.4).items():
        try:
            s.set_editor_property(k, v)
        except Exception as e:
            unreal.log_warning(f"[GospelToon]      (grade {k} not set: {e})")
    p.set_editor_property("settings", s)


# 5. A vertical 9:16 film camera standing on the ground at head height, looking across the valley.
#    It finds the ground by itself, so you don't have to fly anywhere. Then the view switches to it.
def ground_z(x, y):
    world = ues.get_editor_world()
    try:
        hit = unreal.SystemLibrary.line_trace_single(world, unreal.Vector(x, y, 500000), unreal.Vector(x, y, -500000),
                                                     unreal.TraceTypeQuery.TRACE_TYPE_QUERY1, False, [], unreal.DrawDebugTrace.NONE, True)
        if isinstance(hit, tuple):
            hit = next((h for h in hit if isinstance(h, unreal.HitResult)), None)
        if hit:
            t = hit.to_tuple()
            for v in t:
                if isinstance(v, unreal.Vector) and abs(v.z) < 400000:
                    return v.z
    except Exception as e:
        unreal.log_warning(f"[GospelToon]      (ground trace failed: {e})")
    return None


def camera():
    z = ground_z(0.0, 0.0)
    if z is None:
        loc, rot = ues.get_level_viewport_camera_info()  # fall back to wherever the view is now
        log("[GospelToon]      ground not found; using your current view")
    else:
        loc = unreal.Vector(0.0, 0.0, z + 170.0)  # 1.7 m above the ground, like a person's eyes
        rot = unreal.Rotator(0.0, 3.0, 0.0)  # roll, pitch (slightly up), yaw
    cam = eas.spawn_actor_from_class(unreal.CineCameraActor, loc, rot)
    n = len([a for a in actors_of(unreal.CineCameraActor) if a.get_actor_label().startswith("GT_Cam")])
    cam.set_actor_label(f"GT_Cam_{n:02d}")
    cc = cam.get_cine_camera_component()
    fb = unreal.CameraFilmbackSettings()
    fb.sensor_width = 13.365  # portrait: width / height = 9 / 16
    fb.sensor_height = 23.76
    cc.set_editor_property("filmback", fb)
    cc.set_editor_property("current_focal_length", 18.0)
    try:
        unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).pilot_level_actor(cam)  # look through it
    except Exception as e:
        unreal.log_warning(f"[GospelToon]      (could not switch the view to the camera: {e})")
    log(f"[GospelToon]      camera {cam.get_actor_label()} at {loc}")


for name, fn in [("golden dawn sun", sun), ("morning haze", fog), ("sky light", skylight), ("cinematic grade", grade), ("9:16 camera on the ground", camera)]:
    step(name, fn)

unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
log("[GospelToon] Done. Look at the Output Log for OK / SKIP lines.")
