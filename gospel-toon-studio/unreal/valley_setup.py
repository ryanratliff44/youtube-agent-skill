"""Run inside Unreal Editor (Python Editor Script Plugin):  py "C:/Users/<you>/youtube-agent-skill/gospel-toon-studio/unreal/valley_setup.py"

Turns the open level into a golden-dawn valley for David and Goliath and makes a vertical (9:16) film camera
exactly where your view is right now. Fly your view to the shot you want FIRST, then run this.
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


# 5. A vertical 9:16 film camera exactly at your current view
def camera():
    loc, rot = ues.get_level_viewport_camera_info()
    cam = eas.spawn_actor_from_class(unreal.CineCameraActor, loc, rot)
    n = len([a for a in actors_of(unreal.CineCameraActor) if a.get_actor_label().startswith("GT_Cam")])
    cam.set_actor_label(f"GT_Cam_{n:02d}")
    cc = cam.get_cine_camera_component()
    fb = unreal.CameraFilmbackSettings()
    fb.sensor_width = 13.365  # portrait: width / height = 9 / 16
    fb.sensor_height = 23.76
    cc.set_editor_property("filmback", fb)
    cc.set_editor_property("current_focal_length", 18.0)
    log(f"[GospelToon]      camera {cam.get_actor_label()} at {loc}")


for name, fn in [("golden dawn sun", sun), ("morning haze", fog), ("sky light", skylight), ("cinematic grade", grade), ("9:16 camera at your view", camera)]:
    step(name, fn)

unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
log("[GospelToon] Done. Look at the Output Log for OK / SKIP lines.")
