"""Native, baked Blender animations. Run through Blender MCP, not a video renderer.

All movement is stored as object/shape-key animation. No frame handlers or drivers
are required for playback, including after reopening the .blend with scripts off.
"""
import bpy, math, os, runpy
from mathutils import Vector

HERE=os.path.dirname(os.path.abspath(__file__))
B=runpy.run_path(os.path.join(HERE,'build_scenes.py'))
text=B['text']; line=B['line']; mesh=B['mesh']; arrow=B['arrow']; dot=B['dot']
project=B['project']; graph=B['graph']; axes=B['axes']; obj=B['obj']
WHITE=B['WHITE']; MUTED=B['MUTED']; CYAN=B['CYAN']; GOLD=B['GOLD']
RED=B['RED']; PURPLE=B['PURPLE']; GRID=B['GRID']; SURF=B['SURF']
FPS=30

def ease(t):
    """Prescribed on-screen easing: cubic-bezier(.77,0,.175,1)."""
    t=max(0,min(1,t)); lo=0.; hi=1.
    for _ in range(18):
        u=(lo+hi)/2; x=3*(1-u)**2*u*.77+3*(1-u)*u*u*.175+u**3
        if x<t: lo=u
        else: hi=u
    return 3*(1-u)*u*u+u**3

def progress(f,a,b,eased=False):
    t=max(0.,min(1.,(f-a)/(b-a)))
    return ease(t) if eased else t

def visibility(o,start,end,limit):
    for frame,hidden in [(1,start>1),(max(1,start-1),True),(start,False),(end,False),(end+1,True)]:
        if frame==1 and start==1: hidden=False
        if frame>limit: continue
        o.hide_viewport=hidden; o.hide_render=hidden
        o.keyframe_insert('hide_viewport',frame=frame)
        o.keyframe_insert('hide_render',frame=frame)

def visible_group(objects,start,end,limit):
    for ob in objects: visibility(ob,start,end,limit)

def movedot(s,name,color=WHITE,r=.075):
    ob=dot(s,(0,0,0),color,r); ob.name=name; return ob

def bake_location(ob,frames,fn):
    for fr in frames:
        ob.location=fn(fr); ob.keyframe_insert('location',frame=fr)

def keyshape(ob,coordinates,name):
    if ob.data.shape_keys is None: ob.shape_key_add(name='Basis')
    key=ob.shape_key_add(name=name); key.slider_min=-10; key.slider_max=10
    if len(key.data)!=len(coordinates): raise ValueError((ob.name,len(key.data),len(coordinates)))
    for v,co in zip(key.data,coordinates): v.co=co
    return key

def bake_value(key,frames,fn):
    for fr in frames:
        key.value=fn(fr); key.keyframe_insert('value',frame=fr)

def moving_line(s,name,color,width=.018):
    ob=line(s,[(0,0,0),(0,0,1)],color,width,name)
    ob.rotation_mode='QUATERNION'
    return ob

def pose_line(ob,a,b,fr):
    a,b=Vector(a),Vector(b); d=b-a
    ob.location=a; ob.rotation_quaternion=d.to_track_quat('Z','Y') if d.length>1e-8 else (1,0,0,0)
    ob.scale=(1,1,max(d.length,1e-7))
    for prop in ('location','rotation_quaternion','scale'): ob.keyframe_insert(prop,frame=fr)

def moving_arrow(s,name,color,width=.024):
    shaft=moving_line(s,name+'_shaft',color,width)
    vs=[(0,0,.16)]+[(.067*math.cos(i*math.tau/16),.067*math.sin(i*math.tau/16),0) for i in range(16)]
    head=mesh(s,vs,[(0,1+i,1+(i+1)%16) for i in range(16)],color,name+'_head')
    head.rotation_mode='QUATERNION'; return shaft,head

def pose_arrow(pair,a,b,fr):
    a,b=Vector(a),Vector(b); d=b-a; length=d.length
    u=d.normalized() if length>1e-8 else Vector((0,0,1))
    headlength=min(.16,length*.45)
    pose_line(pair[0],a,b-headlength*u,fr)
    head=pair[1]; head.location=b-headlength*u
    head.rotation_quaternion=u.to_track_quat('Z','Y'); head.scale=(min(1,length/.35),)*2+(max(headlength/.16,1e-7),)
    for prop in ('location','rotation_quaternion','scale'): head.keyframe_insert(prop,frame=fr)

def draw_path(s,name,points,color,width=.025):
    ob=line(s,points,color,width,name)
    return ob

def reveal(path,frames,fn):
    for fr in frames:
        path.data.bevel_factor_end=max(0,min(1,fn(fr)))
        path.data.keyframe_insert('bevel_factor_end',frame=fr)

def arc_fraction(points,t):
    lengths=[0.]
    for a,b in zip(points,points[1:]): lengths.append(lengths[-1]+(Vector(b)-Vector(a)).length)
    i=max(0,min(len(points)-1,t*(len(points)-1))); j=int(i)
    value=lengths[j] if j==len(points)-1 else lengths[j]+(i-j)*(lengths[j+1]-lengths[j])
    return value/lengths[-1] if lengths[-1] else 0

def chapter(key,title,subtitle,phases,end,wide=False):
    s=B['board']('LIVE_'+key,title,subtitle,'ЖИВАЯ СЦЕНА · SPACE — ПУСК / ПАУЗА',wide=wide)
    s.render.engine='BLENDER_WORKBENCH'; s.frame_start=1; s.frame_end=end; s.render.fps=FPS
    s.display.viewport_aa='FXAA'; s.display.render_aa='32'
    s.sync_mode='FRAME_DROP'; s['matan_live']=True; s['lesson_key']=key
    s['phase_frames']=[p[0] for p in phases]; s['phase_names']=[p[1] for p in phases]
    s['lesson_title']=title
    shading=s.display.shading; shading.light='FLAT'; shading.color_type='MATERIAL'
    shading.show_shadows=False; shading.show_cavity=False; shading.show_specular_highlight=False
    shading.background_type='WORLD'; s.world.color=(.008,.014,.026)
    for i,(fr,label) in enumerate(phases):
        s.timeline_markers.new(str(i+1)+' · '+label,frame=fr)
        endfr=phases[i+1][0]-1 if i+1<len(phases) else end
        t=text(s,str(i+1).zfill(2)+' / '+label,-9.1,2.8,.25,CYAN)
        visibility(t,fr,endfr,end)
    # Keep all geometry selectable/editable; hide only helper camera overlays in viewport.
    return s

def phase_text(s,start,end,heading,formula,explanation='',y=2.05):
    created=[text(s,heading,1.75,y,.22,GOLD),text(s,formula,1.75,y-.66,.32)]
    if explanation:
        lines=formula.count('\n')+1
        created.append(text(s,explanation,1.75,y-.66-lines*.45-.35,.26,MUTED))
    visible_group(created,start,end,s.frame_end)
    return created

def finalize(s):
    s.frame_set(1)
    # Use linear interpolation for sampled mathematical data, constant for booleans.
    ids=list(s.objects)+[o.data for o in s.objects if o.data]+[o.data.shape_keys for o in s.objects if o.type in {'MESH','CURVE'} and o.data.shape_keys]
    for idb in ids:
        ad=idb.animation_data
        if not ad or not ad.action: continue
        action=ad.action
        curves=[]
        if hasattr(action,'fcurves'): curves=list(action.fcurves)
        else:
            for layer in action.layers:
                for strip in layer.strips:
                    if hasattr(strip,'channelbag'):
                        bag=strip.channelbag(ad.action_slot)
                        if bag: curves.extend(bag.fcurves)
        for fc in curves:
            interpolation='CONSTANT' if fc.data_path in {'hide_render','hide_viewport'} else 'LINEAR'
            for k in fc.keyframe_points: k.interpolation=interpolation
    return s

def lesson1():
    end=900
    s=chapter('01_Differentiability','Дифференцируемость: приближаем точку','3.1.9–11  /  f(x,y)=x²+2y²; a=(½,¼)',[(1,'Поверхность и точка a'),(151,'Сечения задают линейную часть'),(331,'Уменьшаем окрестность'),(721,'Остаток мал относительно ‖h‖')],end)
    P=lambda p:project(p,center=(-5,-1.3,0),scale=1.48)
    N=24; uv=[(-1+2*i/N,-1+2*j/N) for i in range(N+1) for j in range(N+1)]
    coords=lambda radius:[P((u,v,u+v+radius*(u*u+2*v*v))) for u,v in uv]
    faces=[(i*(N+1)+j,(i+1)*(N+1)+j,(i+1)*(N+1)+j+1,i*(N+1)+j+1) for i in range(N) for j in range(N)]
    radius=lambda fr:.65*(.04/.65)**progress(fr,331,720,True)
    frames=range(1,end+1)
    for color,wire in [(SURF,False),(GRID,True)]:
        ob=mesh(s,coords(.65),faces,color,'Zoom_Surface' if not wire else 'Zoom_Grid')
        if wire:
            m=ob.modifiers.new('Grid','WIREFRAME'); m.thickness=.008; m.offset=1
        key=keyshape(ob,coords(0),'Flattening')
        bake_value(key,frames,lambda f:1-radius(f)/.65)
    plane=[]
    for i in range(9):
        t=-1+i/4
        plane.append(line(s,[P((u,t,u+t)) for u in [-1,1]],GOLD,.009))
        plane.append(line(s,[P((t,v,t+v)) for v in [-1,1]],GOLD,.009))
    visible_group(plane,151,end,end)
    for axis,color in [(0,CYAN),(1,PURPLE)]:
        vals=[-1+i/40 for i in range(81)]
        crd=lambda r:[P((t,0,t+r*t*t)) if axis==0 else P((0,t,t+2*r*t*t)) for t in vals]
        ob=line(s,crd(.65),color,.025,'Coordinate_section')
        key=keyshape(ob,crd(0),'Flattening'); bake_value(key,frames,lambda f:1-radius(f)/.65)
        visibility(ob,151,end,end)
    dot(s,P((0,0,0))); text(s,'a',-5.18,-1.66,.27)
    approx=P((.8,.5,1.3)); error=moving_line(s,'Remainder',RED,.032)
    actualdot=movedot(s,'Exact_value',RED); approx_dot=dot(s,(*approx[:2],8),GOLD,.06)
    for fr in frames:
        r=radius(fr); exact=P((.8,.5,1.3+1.14*r))
        pose_line(error,(*approx[:2],8),(*exact[:2],8),fr)
        actualdot.location=(*exact[:2],8); actualdot.keyframe_insert('location',frame=fr)
    visible_group([error,actualdot,approx_dot],151,end,end)
    phase_text(s,1,150,'ФУНКЦИЯ В ТОЧКЕ','f(a+h) − f(a)','На поверхности отмечена точка a.\nХотим описать малые приращения.')
    phase_text(s,151,330,'ОДНА ПЛОСКОСТЬ ДЛЯ ВСЕХ h','dfₐ(h) = h₁ + h₂','Сечения дают f′ₓ(a)=f′ᵧ(a)=1.\nЖёлтая сетка — касательная плоскость.\nКрасный отрезок — точное значение\nминус линейное приближение.')
    phase_text(s,331,720,'СМОТРИМ ВБЛИЗИ a','f(a+h) = f(a) + dfₐ(h) + r(h)','Полуширина окна: 0.65 → 0.04.\nВсе три оси увеличиваются одинаково.\nПоверхность сближается с плоскостью.')
    phase_text(s,721,end,'ОЦЕНКА ДЛЯ ВСЕХ НАПРАВЛЕНИЙ','r(h) = h₁² + 2h₂²\n0 ≤ r(h)/‖h‖ ≤ 2‖h‖ → 0','Исчезает ошибка относительно шага.\nЭто и означает r(h)=o(‖h‖).')
    legend=text(s,'СЕЧЕНИЯ: x — бирюзовое; y — фиолетовое',-9.1,-4.8,.22,MUTED)
    visibility(legend,151,end,end)
    before_bar=set(s.objects)
    text(s,'Относительный остаток для отмеченного h',1.75,-3.45,.24,RED)
    line(s,[(1.75,-4.8,8),(8.9,-4.8,8)],GRID,.015)
    bar=moving_line(s,'Relative_error_bar',RED,.11)
    for fr in frames:
        value=1.14*radius(fr)/math.hypot(.8,.5)
        pose_line(bar,(1.9,-4.45,8),(1.9+6.4*value/.7855,-4.45,8),fr)
    text(s,'0',1.75,-5.15,.20,MUTED); text(s,'0.79',8,-5.15,.20,MUTED)
    visible_group(list(set(s.objects)-before_bar),151,end,end)
    return finalize(s)

def lesson2():
    end=1020
    s=chapter('02_Staircase','Достаточное условие: пройти «лесенкой»','3.2.4  /  Частные производные существуют в окрестности a и непрерывны в a',[(1,'Выбраны начало и конец'),(91,'Меняем только x₁'),(301,'Меняем только x₂'),(541,'Промежуточные точки идут к a'),(841,'После вычитания линейной части')],end)
    f=lambda x,y:x*x+2*y*y; a=(.2,.1); d=(.85,.65)
    P=lambda p:project(p,center=(-6.65,-2.65,0),scale=1.65)
    graph(s,f,P,0,1.15,n=32,fill=False); axes(s,P,1.5)
    frames=range(1,end+1)
    lam=lambda fr:1-.92*progress(fr,561,840,True)
    q1=lambda t,l:(a[0]+l*t*d[0],a[1])
    q2=lambda t,l:(a[0]+l*d[0],a[1]+l*t*d[1])
    xyz=lambda q:(*q,f(*q))
    times=[i/80 for i in range(81)]
    paths=[]
    for which,(qfun,col,start,stop) in enumerate([(q1,GOLD,91,300),(q2,CYAN,301,510)]):
        zero=[P(xyz(a)) for t in times]
        # Position is exactly quadratic in lambda: basis + lambda*linear + lambda²*quadratic.
        at1=[Vector(P(xyz(qfun(t,1)))) for t in times]
        athalf=[Vector(P(xyz(qfun(t,.5)))) for t in times]
        b0=[Vector(p) for p in zero]
        linear=[4*(h-b)- (v-b) for h,v,b in zip(athalf,at1,b0)]
        quad=[v-b-l for v,b,l in zip(at1,b0,linear)]
        ob=line(s,zero,col,.031,'Staircase_'+str(which+1)); paths.append(ob)
        kl=keyshape(ob,[b+l for b,l in zip(b0,linear)],'Linear_increment')
        kq=keyshape(ob,[b+q for b,q in zip(b0,quad)],'Quadratic_increment')
        bake_value(kl,frames,lam); bake_value(kq,frames,lambda fr:lam(fr)**2)
        fixed=[tuple(v) for v in at1]
        reveal(ob,frames,lambda fr:arc_fraction(fixed,progress(fr,start,stop)))
        visibility(ob,start,end,end)
    ball=movedot(s,'Moving_point',WHITE,.083)
    tangent1=moving_arrow(s,'Tangent_x1',GOLD)
    tangent2=moving_arrow(s,'Tangent_x2',CYAN)
    xi1=movedot(s,'Xi1',GOLD,.052); xi2=movedot(s,'Xi2',CYAN,.052)
    v1=moving_arrow(s,'Intermediate_tangent_1',GOLD,.016)
    v2=moving_arrow(s,'Intermediate_tangent_2',CYAN,.016)
    x_end=movedot(s,'Endpoint',CYAN,.058)
    for fr in frames:
        l=lam(fr)
        if fr<=300: q=q1(progress(fr,91,300),1)
        elif fr<=540: q=q2(progress(fr,301,510),1)
        else: q=q2(1,l)
        pp=P(xyz(q)); ball.location=pp; ball.keyframe_insert('location',frame=fr)
        pose_arrow(tangent1,pp,P((q[0]+.28,q[1],f(*q)+.28*2*q[0])),fr)
        pose_arrow(tangent2,pp,P((q[0],q[1]+.22,f(*q)+.22*4*q[1])),fr)
        qx=q1(.5,l); qy=q2(.5,l)
        xi1.location=P(xyz(qx)); xi1.keyframe_insert('location',frame=fr)
        xi2.location=P(xyz(qy)); xi2.keyframe_insert('location',frame=fr)
        pose_arrow(v1,P(xyz(qx)),P((qx[0]+.3,qx[1],f(*qx)+.3*2*qx[0])),fr)
        pose_arrow(v2,P(xyz(qy)),P((qy[0],qy[1]+.3,f(*qy)+.3*4*qy[1])),fr)
        x_end.location=P(xyz(q2(1,l))); x_end.keyframe_insert('location',frame=fr)
    visible_group(tangent1,91,300,end); visible_group(tangent2,301,540,end)
    visible_group([xi1,xi2,*v1,*v2],541,end,end)
    dot(s,P(xyz(a))); qa=P(xyz(a)); text(s,'a',qa[0]-.28,qa[1]-.3,.26)
    # Projection of the two legs onto the argument plane.
    ground1=moving_arrow(s,'Argument_leg_1',GOLD,.015); ground2=moving_arrow(s,'Argument_leg_2',CYAN,.015)
    for fr in frames:
        l=lam(fr); first=q1(progress(fr,91,300),l); second=q2(progress(fr,301,510),l)
        pose_arrow(ground1,P((*a,0)),P((*first,0)),fr)
        pose_arrow(ground2,P((*q1(1,l),0)),P((*second,0)),fr)
    visible_group(ground1,91,end,end); visible_group(ground2,301,end,end)
    phase_text(s,1,90,'СВОДИМ К ОДНОЙ ПЕРЕМЕННОЙ','a = (a₁,a₂);   x = (x₁,x₂)','Соединяем точки двумя координатными\nучастками. По каждому можно применить\nодномерную теорему Лагранжа.')
    phase_text(s,91,300,'ПЕРВЫЙ УЧАСТОК','Δ₁ = f(x₁,a₂) − f(a₁,a₂)\nΔ₁ = f′ₓ₁(ξ₁,a₂)(x₁−a₁)','Вторая координата постоянна.\nξ₁ находится между a₁ и x₁.')
    phase_text(s,301,540,'ВТОРОЙ УЧАСТОК','Δ₂ = f(x₁,x₂) − f(x₁,a₂)\nΔ₂ = f′ₓ₂(x₁,ξ₂)(x₂−a₂)','Первая координата постоянна.\nξ₂ находится между a₂ и x₂.\nПолное приращение равно Δ₁ + Δ₂.')
    phase_text(s,541,840,'ЗДЕСЬ НУЖНА НЕПРЕРЫВНОСТЬ','f′ₓ₁(ξ₁,a₂) → f′ₓ₁(a)\nf′ₓ₂(x₁,ξ₂) → f′ₓ₂(a)','x → a: оба места вычисления\nпроизводных тоже приближаются к a.\nПишем f′ₓₖ(пром. точка)=f′ₓₖ(a)+εₖ(x).')
    phase_text(s,841,end,'ЛИНЕЙНАЯ ЧАСТЬ + ОСТАТОК','r = ε₁(x)(x₁−a₁) + ε₂(x)(x₂−a₂)\n|r|/‖x−a‖ ≤ |ε₁(x)| + |ε₂(x)|','Обе εₖ(x) → 0. Значит r=o(‖x−a‖).\nЛинейная часть:\nf′ₓ₁(a)(x₁−a₁) + f′ₓ₂(a)(x₂−a₂).')
    text(s,'Стрелки на поверхности показывают частные наклоны.',-9.1,-4.8,.22,MUTED)
    return finalize(s)

def composition_components(x,y):
    U=x+.5*y; V=.2*x+y; q=.3*y*y; w=.25*x*x
    A=Vector((U,V)); BA=Vector((1.1*U+.6*V,-.3*U+.9*V))
    QF=Vector((q,w)); QG=Vector((1.1*q+.6*w+.2*V*V,-.3*q+.9*w+.15*U*U))
    RG=Vector((.4*V*w,.3*U*q)); SG=Vector((.2*w*w,.15*q*q))
    return A,BA,QF,QG,RG,SG

def lesson3():
    end=1020
    s=chapter('03_Composition','Композиция: две последовательные деформации','3.2.5  /  a и b=F(a) — внутренние точки; F дифференцируемо в a, G — в b',[(1,'Малая сетка вокруг a'),(91,'Сначала действует F'),(331,'Затем действует G'),(571,'Сравниваем с производными'),(691,'Приближаемся к a'),(871,'Почему остатки остаются малыми')],end,wide=True)
    frames=range(1,end+1); centers=[-6.4,-.2,5.8]
    radius=lambda fr:.65*(.06/.65)**progress(fr,691,870,True)
    qF=lambda fr:progress(fr,91,300,True)
    qG=lambda fr:progress(fr,331,540,True)
    shape_fn=[None,lambda p,f:Vector(p)+qF(f)*(composition_components(*p)[0]-Vector(p)+radius(f)*composition_components(*p)[2]),lambda p,f:composition_components(*p)[0]+radius(f)*composition_components(*p)[2]+qG(f)*(composition_components(*p)[1]-composition_components(*p)[0]+radius(f)*(composition_components(*p)[3]-composition_components(*p)[2])+radius(f)**2*composition_components(*p)[4]+radius(f)**3*composition_components(*p)[5])]
    for idx,cx in enumerate(centers):
        P=lambda q:(cx+1.2*q[0],.6+1.2*q[1],0)
        data=[]
        for i in range(9):
            t=-.85+1.7*i/8
            for swap in [False,True]: data.append([(t,-.85+1.7*j/32) if swap else (-.85+1.7*j/32,t) for j in range(33)])
        group=[]
        for points in data:
            if idx==0:
                ob=line(s,[P(p) for p in points],CYAN,.011,'Input_grid'); group.append(ob); continue
            comps=[composition_components(*p) for p in points]
            bases=[Vector(p) if idx==1 else c[0] for p,c in zip(points,comps)]
            ob=line(s,[P(p) for p in bases],CYAN,.012,'F_grid' if idx==1 else 'GF_grid'); group.append(ob)
            if idx==1:
                terms=[([c[0]-Vector(p) for c,p in zip(comps,points)],qF),([c[2] for c in comps],lambda fr:qF(fr)*radius(fr))]
            else:
                terms=[([c[2] for c in comps],radius),([c[1]-c[0] for c in comps],qG),([c[3]-c[2] for c in comps],lambda fr:qG(fr)*radius(fr)),([c[4] for c in comps],lambda fr:qG(fr)*radius(fr)**2),([c[5] for c in comps],lambda fr:qG(fr)*radius(fr)**3)]
            for k,(deltas,func) in enumerate(terms):
                key=keyshape(ob,[P(b+d) for b,d in zip(bases,deltas)],'Polynomial_'+str(k))
                bake_value(key,frames,func)
        if idx>0: visible_group(group,91 if idx==1 else 331,end,end)
        # True linear image, independent of the radius of the inspected window.
        lin=(lambda x,y:Vector((x,y))) if idx==0 else (lambda x,y:composition_components(x,y)[0 if idx==1 else 1])
        bounds=[]
        for side in [-1,1]:
            for swap in [False,True]:
                points=[(side*.85,j*.85) if swap else (j*.85,side*.85) for j in [-1,1]]
                bounds.append(line(s,[(*P(lin(*p))[:2],.05) for p in points],GOLD,.022))
        visible_group(bounds,1 if idx==0 else 571,end,end)
        lab=text(s,['h','F′(a)h','G′(b)F′(a)h'][idx],cx-1,-1.35,.30,GOLD)
        visibility(lab,1 if idx==0 else 571,end,end)
        h=(.5,.3); vector=moving_arrow(s,'Linear_vector_'+str(idx),GOLD)
        exact=movedot(s,'Actual_increment_'+str(idx),CYAN,.065)
        gap=moving_line(s,'Nonlinear_gap_'+str(idx),RED,.033)
        for fr in frames:
            real=Vector(h) if idx==0 else shape_fn[idx](h,fr)
            p=P(real); approx=P(lin(*h))
            exact.location=(*p[:2],.12); exact.keyframe_insert('location',frame=fr)
            pose_arrow(vector,(cx,.6,.15),(*approx[:2],.15),fr)
            pose_line(gap,(*p[:2],.2),(*approx[:2],.2),fr)
        visible_group(vector,1 if idx==0 else 571,end,end)
        visibility(exact,1 if idx==0 else (91 if idx==1 else 331),end,end)
        visibility(gap,571,end,end)
    for idx,title in enumerate(['Окрестность a','Внутреннее приращение K','Приращение композиции']): text(s,title,centers[idx]-2,2.14,.25)
    text(s,'F',-3.5,.75,.34,GOLD); text(s,'G',2.9,.75,.34,GOLD)
    ranges=[(1,90,'Начальный вектор h. Сетку можно сделать сколь угодно малой.'),(91,330,'Сетка плавно переходит в точный образ под F.'),(331,570,'Теперь к результату F применяем G.'),(571,690,'Жёлтые границы — линейные образы. Красным показаны остатки.'),(691,870,'Уменьшаем исходное окно и одинаково увеличиваем все три изображения.'),(871,end,'Линейные модели совпадают с нелинейными с точностью o(‖h‖).')]
    for lo,hi,body in ranges:
        ob=text(s,body,-9.1,-2.2,.27,MUTED); visibility(ob,lo,hi,end)
    t=text(s,"(G ∘ F)′(a)h = G′(b)(F′(a)h)",-9.1,-3.10,.42); visibility(t,571,end,end)
    t=text(s,'A = F′(a);   B = G′(b)   ⇒   сначала A, затем B; произведение BA.',-9.1,-3.8,.26); visibility(t,571,870,end)
    t=text(s,'‖K‖ ≤ C‖h‖;   G(b+K)=G(b)+BK+β(K)‖K‖;   β(K) → 0',-9.1,-3.8,.28); visibility(t,871,end,end)
    t=text(s,'Bα(h)‖h‖ + β(K)‖K‖ = o(‖h‖),  где K=Ah+α(h)‖h‖ и α(h)→0.',-9.1,-4.45,.27,RED); visibility(t,871,end,end)
    t=text(s,'F(x,y)=(x+½y+0.3y², 0.2x+y+¼x²)',-9.1,-4.62,.24,MUTED); visibility(t,1,870,end)
    t=text(s,'G(u,v)=(1.1u+0.6v+0.2v², −0.3u+0.9v+0.15u²)',-9.1,-5.08,.24,MUTED); visibility(t,1,870,end)
    return finalize(s)

def lesson4():
    end=1230
    s=chapter('04_Lagrange','Векторная Лагранжа: от кривой к проекции','3.2.7  /  F непрерывно на [a,b] и дифференцируемо на (a,b)',[(1,'Точка проходит пространственную кривую'),(241,'Проецируем перемещение на хорду'),(481,'Проецируем вектор скорости'),(721,'Скалярная Лагранжа выбирает c'),(901,'Контрпример: полный обход окружности'),(1141,'Перемещение ноль, скорость не ноль')],end)
    F=lambda t:Vector((math.cos(t),math.sin(t),.4*t))
    P=lambda p:project(p,center=(-5.1,-1.25,0),scale=2)
    v=F(math.pi)-F(0); c=math.asin(2/math.pi)
    frames=range(1,end+1)
    def t_at(fr):
        if fr<=240: return math.pi*progress(fr,31,240)
        if fr<=480: return math.pi*(1-progress(fr,241,480))
        return c*progress(fr,481,700,True)
    coords=[P(F(math.pi*i/160)) for i in range(161)]
    curve=draw_path(s,'Space_curve',coords,CYAN,.034)
    reveal(curve,frames,lambda fr:progress(fr,31,240))
    group=[curve]
    chord_before=set(s.objects); arrow(s,P(F(0)),P(F(math.pi)),GOLD,.032)
    chord=list(set(s.objects)-chord_before); visible_group(chord,241,900,end)
    group+=chord
    ball=movedot(s,'Curve_point',WHITE,.085); group.append(ball)
    foot=movedot(s,'Displacement_projection',RED,.064)
    drop=moving_line(s,'Drop_to_chord',MUTED,.015)
    displacement=moving_arrow(s,'Projected_displacement',RED,.025)
    speed=moving_arrow(s,'Velocity',PURPLE,.03)
    speedproj=moving_arrow(s,'Projected_velocity',RED,.027)
    speeddrop=moving_line(s,'Velocity_projection_guide',MUTED,.013)
    for fr in frames:
        t=t_at(fr); pos=F(t); vel=Vector((-math.sin(t),math.cos(t),.4))
        base=F(0)+v*(v.dot(pos-F(0))/v.length_squared)
        proj=v*(v.dot(vel)/v.length_squared)
        ball.location=P(pos); ball.keyframe_insert('location',frame=fr)
        foot.location=P(base); foot.keyframe_insert('location',frame=fr)
        pose_line(drop,P(pos),P(base),fr)
        pose_arrow(displacement,P(F(0)),P(base),fr)
        pose_arrow(speed,P(pos),P(pos+vel),fr)
        pose_arrow(speedproj,P(pos),P(pos+proj),fr)
        pose_line(speeddrop,P(pos+vel),P(pos+proj),fr)
    visible_group([foot,drop,*displacement],241,480,end)
    visible_group([*speed,*speedproj,speeddrop],481,900,end)
    visible_group(group,1,900,end)
    # The chord should still appear only when its role has been introduced.
    visible_group(chord,241,900,end)
    for t,label in [(0,'F(a)'),(math.pi,'F(b)')]:
        pos=P(F(t)); d=dot(s,pos,WHITE,.06); lab=text(s,label,pos[0]+.12,pos[1]+.12,.25)
        visible_group([d,lab],1,900,end)
    pos=P(F(c)); lab=text(s,'F(c)',pos[0]-.5,pos[1]-.45,.27,GOLD); visibility(lab,721,900,end)
    phase_text(s,1,240,'ВЕКТОРНОЕ ПЕРЕМЕЩЕНИЕ','F(b) − F(a)','Сначала рисуем путь.\nРазность концов — вектор,\nа не длина пройденной кривой.')
    phase_text(s,241,480,'ФИКСИРУЕМ НАПРАВЛЕНИЕ ХОРДЫ','v = F(b) − F(a)\nφ(t) = ⟨v, F(t) − F(a)⟩','Красным показана проекция перемещения.\nφ(t) — её знаковая длина,\nумноженная на ‖v‖.\nφ(a)=0; φ(b)=‖v‖².')
    phase_text(s,481,720,'ПРОИЗВОДНАЯ ЭТОЙ ПРОЕКЦИИ','φ′(t) = ⟨v, F′(t)⟩','Фиолетовый вектор — F′(t).\nКрасный — его проекция вдоль хорды.\nДалее применяем обычную\nодномерную теорему Лагранжа.')
    phase_text(s,721,900,'ЕСТЬ c МЕЖДУ a И b','‖v‖² = ⟨v,F′(c)⟩(b−a)\n≤ ‖v‖ · ‖F′(c)‖ · |b−a|','Последнее неравенство — КБШ.\nЕсли v≠0, сокращаем на ‖v‖.\nЕсли v=0, оценка уже верна.')
    # Counterexample in exactly the same live scene.
    cp=lambda t:(-5.1+2.2*math.cos(t),-.6+2.2*math.sin(t),0)
    circle=draw_path(s,'Circle_counterexample',[cp(math.tau*i/160) for i in range(161)],CYAN,.032)
    reveal(circle,frames,lambda fr:progress(fr,901,1140))
    cb=movedot(s,'Circle_point',WHITE,.09); cv=moving_arrow(s,'Circle_velocity',GOLD,.03)
    for fr in frames:
        t=math.tau*progress(fr,901,1140); p=Vector(cp(t))
        cb.location=p; cb.keyframe_insert('location',frame=fr)
        pose_arrow(cv,p,p+Vector((-math.sin(t),math.cos(t),0)),fr)
    start=dot(s,cp(0),RED,.085)
    visible_group([circle,cb,start,*cv],901,end,end)
    lab=text(s,'F(0)=F(2π)',-3.9,-1.05,.26,RED); visibility(lab,1141,end,end)
    phase_text(s,901,1140,'ПРОВЕРЯЕМ ВЕКТОРНОЕ РАВЕНСТВО','F(t) = (cos t, sin t)\nt ∈ [0,2π]','Точка возвращается в начало.\nСтрелка показывает направление скорости.\nСкорость нигде не обращается в ноль.')
    phase_text(s,1141,end,'РАВЕНСТВО НЕВОЗМОЖНО','F(2π) − F(0) = 0\n‖F′(t)‖ = 1','0 = F′(c)·2π невозможно при любом c.\nНо оценка нормы 0 ≤ 2π верна.')
    return finalize(s)

def lesson5():
    end=1050
    s=chapter('05_Gradient','Градиент: вращаем единичное направление','3.1.12–13 · 3.2.8  /  f(x,y)=x²+2y²; a=(½,¼); ∇f(a)=(1,1)',[(1,'Направление вдоль градиента'),(121,'Вращаем направление u'),(391,'Поперёк градиента: нулевой наклон'),(481,'Поворачиваем против градиента'),(691,'Направление наискорейшего убывания'),(781,'Полный оборот: возвращаемся к максимуму')],end)
    f=lambda x,y:x*x+2*y*y; a=(.5,.25)
    P=lambda p:project(p,center=(-6.4,-2.5,0),scale=1.7)
    graph(s,f,P,0,1.1,n=32,fill=False); axes(s,P,1.5)
    frames=range(1,end+1)
    def turn(fr):
        if fr<=390: return math.pi/2*progress(fr,121,390,True)
        if fr<=480: return math.pi/2
        if fr<=690: return math.pi/2+math.pi/2*progress(fr,481,690,True)
        if fr<=780: return math.pi
        return math.pi+math.pi*progress(fr,781,990,True)
    angle=lambda fr:math.pi/4+turn(fr)
    q=[-.32+.64*i/64 for i in range(65)]
    origin=P((*a,f(*a))); base=[origin for _ in q]
    section=line(s,base,CYAN,.032,'Rotating_section')
    # Exact quadratic section: f(a+t*u), no sampled mesh sequence.
    kx=keyshape(section,[P((a[0]+t,a[1],f(*a)+t)) for t in q],'u_x')
    ky=keyshape(section,[P((a[0],a[1]+t,f(*a)+t)) for t in q],'u_y')
    kq=keyshape(section,[P((a[0],a[1],f(*a)+t*t)) for t in q],'Curvature')
    bake_value(kx,frames,lambda fr:math.cos(angle(fr)))
    bake_value(ky,frames,lambda fr:math.sin(angle(fr)))
    bake_value(kq,frames,lambda fr:math.cos(angle(fr))**2+2*math.sin(angle(fr))**2)
    dot(s,origin); text(s,'a',origin[0]-.25,origin[1]-.25,.25)
    gd=P((*a,0)); uvec=moving_arrow(s,'Unit_direction_on_domain',CYAN)
    lift=moving_arrow(s,'Lifted_tangent',GOLD,.022)
    before=set(s.objects); arrow(s,gd,P((a[0]+.48/math.sqrt(2),a[1]+.48/math.sqrt(2),0)),GOLD,.014)
    gradobjs=list(set(s.objects)-before)
    # A front-facing unit-circle instrument makes the signed projection easy to compare.
    center=Vector((4.2,-2.05,8)); rr=1.2
    ring=line(s,[tuple(center+Vector((rr*math.cos(i*math.tau/120),rr*math.sin(i*math.tau/120),0))) for i in range(121)],GRID,.018)
    arrow(s,center,center+Vector((rr,0,0)),GOLD,.02)
    text(s,'∇f / ‖∇f‖',4.8,-2.4,.20,GOLD)
    rose=moving_arrow(s,'Rotating_unit_direction',CYAN,.024)
    projection=moving_line(s,'Cosine_projection',RED,.035)
    perpendicular=moving_line(s,'Cosine_guide',MUTED,.012)
    signed=moving_arrow(s,'Signed_directional_derivative',CYAN,.04)
    axisbase=Vector((8,-2.05,8))
    line(s,[(8,-3.55,8),(8,-.55,8)],GRID,.013)
    for y,lab in [(-.55,'+√2'),(-2.05,'0'),(-3.55,'−√2')]:
        line(s,[(7.85,y,8),(8.15,y,8)],MUTED,.01); text(s,lab,8.28,y-.07,.23,MUTED)
    text(s,'Единичное направление u',2.5,-4.0,.23,MUTED)
    text(s,'Наклон ∂ᵤf(a)',6.75,-4,.23,CYAN)
    for fr in frames:
        theta=angle(fr); ux,uy=math.cos(theta),math.sin(theta); derivative=ux+uy
        pose_arrow(uvec,gd,P((a[0]+.48*ux,a[1]+.48*uy,0)),fr)
        pose_arrow(lift,origin,P((a[0]+.32*ux,a[1]+.32*uy,f(*a)+.32*derivative)),fr)
        theta=turn(fr); tip=center+Vector((rr*math.cos(theta),rr*math.sin(theta),0)); foot=center+Vector((rr*math.cos(theta),0,0))
        pose_arrow(rose,center,tip,fr)
        pose_line(projection,center,foot,fr); pose_line(perpendicular,tip,foot,fr)
        pose_arrow(signed,axisbase,axisbase+Vector((0,1.5*math.cos(theta),0)),fr)
    text(s,'∂ᵤf(a) = ⟨∇f(a),u⟩ = √2 cos θ',1.75,1.88,.32)
    for lo,hi,body in [(1,120,'u вдоль градиента: наклон максимален.'),(121,390,'Проекция уменьшается вместе с наклоном.'),(391,480,'Проекция ноль: линейного изменения нет.'),(481,690,'Проекция становится отрицательной.'),(691,780,'u против градиента: наклон равен −√2.'),(781,end,'Максимальный наклон вновь при u=∇f/‖∇f‖.')]:
        ob=text(s,body,1.75,1.2,.25,MUTED); visibility(ob,lo,hi,end)
    text(s,'Жёлтый вектор на поверхности — касательный.',-9.1,-4.48,.22,MUTED)
    text(s,'Бирюзовое сечение меняется вместе с u.',-9.1,-4.88,.22,MUTED)
    t=text(s,'Нулевой наклон в a не означает\nпостоянства функции вдоль всей прямой.',1.75,-4.7,.24,PURPLE)
    visibility(t,391,480,end)
    return finalize(s)

def prepare_view(s):
    bpy.context.window.scene=s
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active; sp.region_3d.view_perspective='CAMERA'
            sp.region_3d.view_camera_zoom=24; sp.region_3d.view_camera_offset=(0,0)
            sp.overlay.show_overlays=False; sp.show_gizmo=False
            sh=sp.shading; sh.type='SOLID'; sh.light='FLAT'; sh.color_type='MATERIAL'
            sh.show_shadows=False; sh.show_cavity=False; sh.show_specular_highlight=False
            sh.background_type='WORLD'
        elif area.type=='DOPESHEET_EDITOR':
            area.spaces.active.mode='TIMELINE'
            region=next((r for r in area.regions if r.type=='WINDOW'),None)
            if region:
                with bpy.context.temp_override(area=area,region=region): bpy.ops.action.view_all()
    s.frame_set(1)

def save_live():
    controls=os.path.join(HERE,'live_controls.py')
    if os.path.exists(controls):
        script=bpy.data.texts.get('START_Матан.py') or bpy.data.texts.new('START_Матан.py')
        script.clear(); script.write(open(controls,encoding='utf-8').read())
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE,'differentiation_live.blend'))

if __name__=='__main__':
    scenes=[lesson1(),lesson2(),lesson3(),lesson4(),lesson5()]
    prepare_view(scenes[0]); save_live()
