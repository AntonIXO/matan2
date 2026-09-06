"""Optional controls for the native MatAn animations.
Run this file, or the embedded START_Матан.py text, to restore the panel.
The animation itself plays with Space even without executing any Python.
"""
import bpy
from bpy.props import StringProperty, IntProperty

def lessons():
    return sorted([s for s in bpy.data.scenes if s.get('matan_live')],key=lambda s:s.get('lesson_key',''))

def pause(context):
    if context.screen and context.screen.is_animation_playing:
        bpy.ops.screen.animation_cancel(restore_frame=False)

def fit(context):
    for area in context.screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active; sp.region_3d.view_perspective='CAMERA'
            sp.region_3d.view_camera_zoom=24; sp.region_3d.view_camera_offset=(0,0)
            sp.overlay.show_overlays=False; sp.show_gizmo=False
            sp.shading.type='SOLID'; sp.shading.light='FLAT'; sp.shading.color_type='MATERIAL'
            sp.shading.show_shadows=False; sp.shading.show_cavity=False
            sp.shading.show_specular_highlight=False; sp.shading.background_type='WORLD'
            area.tag_redraw()
        elif area.type=='DOPESHEET_EDITOR':
            region=next((r for r in area.regions if r.type=='WINDOW'),None)
            if region:
                with context.temp_override(area=area,region=region): bpy.ops.action.view_all()

def phase_index(s):
    frames=list(s.get('phase_frames',[1]))
    return max((i for i,fr in enumerate(frames) if fr<=s.frame_current),default=0)

def anchor(s,i):
    frames=list(s['phase_frames']); end=frames[i+1]-1 if i+1<len(frames) else s.frame_end
    return (frames[i]+end)//2

class MATAN_OT_select(bpy.types.Operator):
    bl_idname='matan.select_lesson'; bl_label='Открыть тему'; bl_description='Открыть живую 3D-сцену'
    scene_name: StringProperty()
    def execute(self,context):
        s=bpy.data.scenes.get(self.scene_name)
        if s is None or not s.get('matan_live'): return {'CANCELLED'}
        pause(context); context.window.scene=s; s.frame_set(1); fit(context)
        return {'FINISHED'}

class MATAN_OT_play(bpy.types.Operator):
    bl_idname='matan.play_pause'; bl_label='Пуск / пауза'
    def execute(self,context):
        if context.screen.is_animation_playing: pause(context)
        else: bpy.ops.screen.animation_play()
        return {'FINISHED'}

class MATAN_OT_restart(bpy.types.Operator):
    bl_idname='matan.restart'; bl_label='С начала'
    def execute(self,context):
        pause(context); context.scene.frame_set(context.scene.frame_start); return {'FINISHED'}

class MATAN_OT_step(bpy.types.Operator):
    bl_idname='matan.step'; bl_label='Шаг доказательства'; bl_description='Остановить движение и показать опорный кадр шага'
    direction: IntProperty(default=1)
    def execute(self,context):
        s=context.scene
        if not s.get('matan_live'): return {'CANCELLED'}
        pause(context); i=max(0,min(len(s['phase_frames'])-1,phase_index(s)+self.direction))
        s.frame_set(anchor(s,i)); return {'FINISHED'}

class MATAN_OT_phase(bpy.types.Operator):
    bl_idname='matan.phase'; bl_label='Показать шаг'
    index: IntProperty(default=0)
    def execute(self,context):
        pause(context); s=context.scene
        s.frame_set(anchor(s,max(0,min(self.index,len(s['phase_frames'])-1)))); return {'FINISHED'}

class MATAN_OT_speed(bpy.types.Operator):
    bl_idname='matan.speed'; bl_label='Скорость'
    fps: IntProperty(default=30)
    def execute(self,context):
        context.scene.render.fps=self.fps; return {'FINISHED'}

class MATAN_OT_fit(bpy.types.Operator):
    bl_idname='matan.fit'; bl_label='Вернуть учебную камеру'
    def execute(self,context):
        fit(context); return {'FINISHED'}

class MATAN_MT_lessons(bpy.types.Menu):
    bl_idname='MATAN_MT_lessons'; bl_label='Матан: выбрать тему'
    def draw(self,context):
        for i,s in enumerate(lessons()):
            self.layout.operator('matan.select_lesson',text=str(i+1)+' · '+s['lesson_title']).scene_name=s.name

class MATAN_PT_live(bpy.types.Panel):
    bl_idname='MATAN_PT_live'; bl_label='Матан · живые объяснения'
    bl_space_type='VIEW_3D'; bl_region_type='UI'; bl_category='Матан'
    def draw(self,context):
        layout=self.layout; s=context.scene
        col=layout.column(align=True)
        titles=['Дифференцируемость','Лесенка','Композиция','Векторная Лагранжа','Градиент']
        for i,scene in enumerate(lessons()):
            row=col.row(); row.operator('matan.select_lesson',text=str(i+1)+' · '+titles[i],depress=scene==s).scene_name=scene.name
        if not s.get('matan_live'): return
        layout.separator()
        row=layout.row(align=True); row.scale_y=1.4
        row.operator('matan.restart',text='',icon='REW')
        row.operator('matan.play_pause',text='Пауза' if context.screen.is_animation_playing else 'Смотреть',icon='PAUSE' if context.screen.is_animation_playing else 'PLAY')
        row=layout.row(align=True)
        row.operator('matan.step',text='Предыдущий шаг',icon='TRIA_LEFT').direction=-1
        row.operator('matan.step',text='Следующий шаг',icon='TRIA_RIGHT').direction=1
        layout.label(text='По шагам — без движения:')
        col=layout.column(align=True)
        for i,name in enumerate(s['phase_names']):
            col.operator('matan.phase',text=str(i+1)+' · '+name,depress=phase_index(s)==i).index=i
        layout.separator(); layout.label(text='Скорость воспроизведения')
        row=layout.row(align=True)
        for fps,label in [(15,'½×'),(30,'1×'),(60,'2×')]:
            row.operator('matan.speed',text=label,depress=s.render.fps==fps).fps=fps
        layout.separator(); layout.operator('matan.fit',text='Вернуть камеру',icon='VIEW_CAMERA')
        layout.label(text='Space — пуск / пауза')
        layout.label(text='Таймлайн можно прокручивать вручную.')

class MATAN_PT_properties(bpy.types.Panel):
    bl_idname='MATAN_PT_properties'; bl_label='Матан · живые объяснения'
    bl_space_type='PROPERTIES'; bl_region_type='WINDOW'; bl_context='scene'; bl_order=-1000
    @classmethod
    def poll(cls,context): return bool(lessons())
    def draw(self,context): MATAN_PT_live.draw(self,context)

def draw_header(self,context):
    if not lessons(): return
    row=self.layout.row(align=True)
    row.separator(); row.menu('MATAN_MT_lessons',text='Матан · темы')
    if context.scene.get('matan_live'):
        row.operator('matan.play_pause',text='',icon='PAUSE' if context.screen.is_animation_playing else 'PLAY')
        row.operator('matan.step',text='',icon='TRIA_LEFT').direction=-1
        row.operator('matan.step',text='',icon='TRIA_RIGHT').direction=1

CLASSES=[MATAN_OT_select,MATAN_OT_play,MATAN_OT_restart,MATAN_OT_step,MATAN_OT_phase,MATAN_OT_speed,MATAN_OT_fit,MATAN_MT_lessons,MATAN_PT_live,MATAN_PT_properties]

def register():
    old=bpy.app.driver_namespace.pop('matan_live_header',None)
    if old:
        try: bpy.types.VIEW3D_HT_header.remove(old)
        except Exception: pass
    for cls in reversed(CLASSES):
        old=getattr(bpy.types,cls.__name__,None)
        if old:
            try: bpy.utils.unregister_class(old)
            except RuntimeError: pass
    for cls in CLASSES: bpy.utils.register_class(cls)
    bpy.types.VIEW3D_HT_header.append(draw_header)
    bpy.app.driver_namespace['matan_live_header']=draw_header

if __name__=='__main__': register()
