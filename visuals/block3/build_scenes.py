"""Run inside Blender through Blender MCP. All geometry and PNGs are native Blender.
No existing scenes are removed. Generated scenes are prefixed MATAN_.
"""
import bpy, math, os, json
from mathutils import Vector, Euler

OUT = os.path.dirname(os.path.abspath(__file__))
FONT = bpy.data.fonts.load('/usr/share/fonts/TTF/DejaVuSans.ttf')
WHITE=(.83,.9,1); MUTED=(.35,.47,.60); CYAN=(.05,.72,.78)
GOLD=(1,.59,.13); RED=(1,.20,.28); PURPLE=(.63,.39,1)
GRID=(.035,.20,.25); SURF=(.012,.065,.085)
R=Euler((math.radians(-58),0,math.radians(-28)),'XYZ').to_matrix()

def material(color):
    name='Matan_'+str(color)
    m=bpy.data.materials.get(name)
    if m: return m
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    nodes=m.node_tree.nodes; nodes.clear()
    e=nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value=(*color,1)
    o=nodes.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(e.outputs[0],o.inputs[0])
    return m

def obj(scene,name,data,color):
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob)
    if color is not None: data.materials.append(material(color))
    return ob

def line(s,points,color=CYAN,width=.018,name='line'):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=width; c.bevel_resolution=2
    p=c.splines.new('POLY'); p.points.add(len(points)-1)
    for v,co in zip(p.points,points): v.co=(*co,1)
    return obj(s,name,c,color)

def text(s,body,x,y,size=.29,color=WHITE,name='label'):
    c=bpy.data.curves.new(name,'FONT'); c.body=body; c.font=FONT; c.size=size; c.space_line=1.35
    o=obj(s,name,c,color); o.location=(x,y,10); return o

def mesh(s,verts,faces,color,name):
    m=bpy.data.meshes.new(name); m.from_pydata(verts,[],faces); m.update()
    return obj(s,name,m,color)

def dot(s,p,color=WHITE,r=.065):
    verts=[]; faces=[]
    for j in range(9):
        for i in range(16):
            t=math.pi*j/8; a=2*math.pi*i/16
            verts.append(tuple(Vector(p)+r*Vector((math.sin(t)*math.cos(a),math.sin(t)*math.sin(a),math.cos(t)))))
    for j in range(8):
        for i in range(16): faces.append((j*16+i,j*16+(i+1)%16,(j+1)*16+(i+1)%16,(j+1)*16+i))
    return mesh(s,verts,faces,color,'point')

def arrow(s,a,b,color=GOLD,width=.025):
    a,b=Vector(a),Vector(b); d=b-a
    if d.length<1e-6: return
    u=d.normalized(); q=u.cross(Vector((0,0,1)))
    if q.length<.01: q=u.cross(Vector((0,1,0)))
    q.normalize(); v=u.cross(q); length=min(.18,d.length*.24); radius=length*.42
    base=b-u*length
    line(s,[a,base],color,width)
    vs=[tuple(b)]+[tuple(base+radius*(math.cos(i*math.tau/16)*q+math.sin(i*math.tau/16)*v)) for i in range(16)]
    mesh(s,vs,[(0,1+i,1+(i+1)%16) for i in range(16)],color,'arrowhead')

def project(p,center=(-4.7,-.6,0),scale=1.6): return tuple(Vector(center)+scale*(R@Vector(p)))

def axes(s,P,extent=2):
    for i,name in enumerate(['x','y','z']):
        a=[0,0,0]; b=[0,0,0]; a[i]=-.35; b[i]=extent
        arrow(s,P(a),P(b),MUTED,.012)
        q=P(b); text(s,name,q[0]+.10,q[1]+.06,.23,MUTED)

def graph(s,f,P,lo=-1.5,hi=1.5,n=44,fill=True):
    vals=[lo+(hi-lo)*i/n for i in range(n+1)]
    if fill:
        verts=[P((x,y,f(x,y))) for x in vals for y in vals]
        faces=[(i*(n+1)+j,(i+1)*(n+1)+j,(i+1)*(n+1)+j+1,i*(n+1)+j+1) for i in range(n) for j in range(n)]
        mesh(s,verts,faces,SURF,'surface')
    for i in range(0,n+1,4):
        t=vals[i]
        line(s,[P((x,t,f(x,t)+.003)) for x in vals],GRID,.009)
        line(s,[P((t,y,f(t,y)+.003)) for y in vals],GRID,.009)

def board(key,title,sub,tag='ОБЯЗАТЕЛЬНЫЙ БИЛЕТ',wide=False):
    s=bpy.data.scenes.new('MATAN_'+key)
    s.render.engine='CYCLES'; s.cycles.samples=32; s.cycles.use_denoising=True
    s.render.resolution_x=1920; s.render.resolution_y=1200; s.render.resolution_percentage=100
    s.render.image_settings.file_format='PNG'; s.render.filepath=os.path.join(OUT,key+'.png')
    s.world=bpy.data.worlds.new(key+'_world'); s.world.use_nodes=True
    s.world.node_tree.nodes['Background'].inputs[0].default_value=(.008,.014,.026,1)
    s.world.node_tree.nodes['Background'].inputs[1].default_value=1
    s.view_settings.view_transform='Standard'
    c=bpy.data.cameras.new(key+'_camera'); c.type='ORTHO'; c.ortho_scale=20
    cam=obj(s,'Camera',c,None); cam.location=(0,0,30); s.camera=cam
    text(s,'МАТАН / БЛОК 03',-9.1,5.35,.23,CYAN)
    text(s,tag,3.1,5.35,.21,GOLD)
    text(s,title,-9.1,4.37,.52)
    text(s,sub,-9.1,3.73,.25,MUTED)
    line(s,[(-9.1,3.38,9),(9.1,3.38,9)],GRID,.012)
    if not wide: line(s,[(1.2,2.95,9),(1.2,-4.55,9)],GRID,.012)
    text(s,'К. П. Кохась · конспект  /  Геометрические примеры — дополнение к доказательству',-9.1,-5.65,.19,MUTED)
    return s

def note(s,heading,formula,explain,y=2.65,color=GOLD):
    text(s,heading,1.75,y,.22,color)
    text(s,formula,1.75,y-.6,.31,WHITE)
    text(s,explain,1.75,y-1.65,.25,MUTED)

def scene1(radius,key):
    s=board(key,'Дифференцируемость: одна линейная модель','3.1.9–11  /  Поверхность, касательная плоскость, частные производные','ОПРЕДЕЛЕНИЯ')
    a=(.5,.25); f=lambda x,y:x*x+2*y*y
    # Centered and uniformly magnified coordinates: every spatial dimension / radius.
    P=lambda p:project(((p[0]-a[0])/radius,(p[1]-a[1])/radius,(p[2]-f(*a))/radius),center=(-5,-1.65,0),scale=1.45)
    vals=[-1+2*i/48 for i in range(49)]
    verts=[P((a[0]+radius*u,a[1]+radius*v,f(a[0]+radius*u,a[1]+radius*v))) for u in vals for v in vals]
    mesh(s,verts,[(i*49+j,(i+1)*49+j,(i+1)*49+j+1,i*49+j+1) for i in range(48) for j in range(48)],SURF,'paraboloid')
    for t in vals[::4]:
        for swap in [False,True]:
            points=[]; plane=[]
            for u in vals:
                dx,dy=(radius*t,radius*u) if swap else (radius*u,radius*t)
                points.append(P((a[0]+dx,a[1]+dy,f(a[0]+dx,a[1]+dy)+.001*radius)))
                plane.append(P((a[0]+dx,a[1]+dy,f(*a)+dx+dy)))
            line(s,points,GRID,.009); line(s,plane,GOLD,.007)
    for swap,col in [(False,CYAN),(True,PURPLE)]:
        pts=[]
        for u in vals:
            dx,dy=(0,radius*u) if swap else (radius*u,0)
            pts.append(P((a[0]+dx,a[1]+dy,f(a[0]+dx,a[1]+dy)+.004*radius)))
        line(s,pts,col,.025)
    dx,dy=radius*.8,radius*.5
    actual=P((a[0]+dx,a[1]+dy,f(a[0]+dx,a[1]+dy)))
    approx=P((a[0]+dx,a[1]+dy,f(*a)+dx+dy))
    # Draw the projected error segment over the opaque surface so neither endpoint is hidden.
    line(s,[(*approx[:2],8),(*actual[:2],8)],RED,.035)
    dot(s,(*actual[:2],8),RED); dot(s,(*approx[:2],8),GOLD,.045)
    dot(s,P((*a,f(*a))),WHITE)
    text(s,'a',-5.15,-1.98,.26)
    text(s,'Сечения: x — бирюзовое; y — фиолетовое',-9,-4.23,.22,MUTED)
    text(s,'Плоскость — жёлтая сетка; остаток — красный',-9,-4.65,.22,MUTED)
    text(s,'Полуширина окна: '+str(radius)+'  ·  одинаковое увеличение осей',-9,2.65,.23,CYAN)
    note(s,'ЛИНЕЙНАЯ ЧАСТЬ','f(x,y) = x² + 2y²;  a = (½, ¼)\ndfₐ(h) = h₁ + h₂','Оба частных наклона в a равны 1.\nПлоскость: z = f(a) + h₁ + h₂.')
    note(s,'ОСТАТОК ОПРЕДЕЛЁН ТОЧНО','r(h) = f(a+h) − f(a) − dfₐ(h)\nr(h) = h₁² + 2h₂²','0 ≤ r(h)/‖h‖ ≤ 2‖h‖ → 0.\nПри увеличении исчезает относительная ошибка.',y=-.55,color=RED)
    ratio=(dx*dx+2*dy*dy)/math.hypot(dx,dy)
    text(s,'Для красного отрезка: r(h)/‖h‖ = '+format(ratio,'.3f'),1.75,-4.25,.25,RED)
    return s

def scene2(stage,key):
    s=board(key,'Достаточное условие: разложить «лесенкой»','3.2.4  /  Частные производные существуют рядом с a и непрерывны в a')
    f=lambda x,y:x*x+2*y*y
    P=lambda p:project(p,center=(-6.8,-2.9,0),scale=1.65)
    graph(s,f,P,0,1.15); axes(s,P,1.6)
    a=(.2,.1); x=(1.05,.75); mid=(x[0],a[1])
    A=P((*a,f(*a))); M=P((*mid,f(*mid))); X=P((*x,f(*x)))
    line(s,[P((a[0]+(x[0]-a[0])*t/60,a[1],f(a[0]+(x[0]-a[0])*t/60,a[1])+.009)) for t in range(61)],GOLD,.035)
    line(s,[P((x[0],a[1]+(x[1]-a[1])*t/60,f(x[0],a[1]+(x[1]-a[1])*t/60)+.009)) for t in range(61)],CYAN,.035)
    for p,label,offset in [(A,'(a₁,a₂)',(-1,-.4)),(M,'(x₁,a₂)',(.2,-.35)),(X,'(x₁,x₂)',(.2,.15))]:
        dot(s,p,WHITE); text(s,label,p[0]+offset[0],p[1]+offset[1],.23)
    for q,col in [(a,WHITE),(mid,GOLD),(x,CYAN)]:
        line(s,[P((*q,0)),P((*q,f(*q)))],col,.009)
    arrow(s,P((*a,0)),P((*mid,0)),GOLD,.022)
    arrow(s,P((*mid,0)),P((*x,0)),CYAN,.022)
    text(s,'Сначала меняется x₁, затем x₂',-9,2.65,.27,CYAN)
    text(s,'Высоты на двух участках складываются точно.',-9,-4.48,.23,MUTED)
    if stage==1:
        note(s,'ТОЧНОЕ РАЗЛОЖЕНИЕ','f(x) − f(a) =\n[f(x₁,x₂) − f(x₁,a₂)]\n+ [f(x₁,a₂) − f(a₁,a₂)]','',y=2.65)
        note(s,'ЛАГРАНЖА НА КАЖДОМ УЧАСТКЕ','= f′ₓ₂(x₁,ξ₂)(x₂−a₂)\n+ f′ₓ₁(ξ₁,a₂)(x₁−a₁)','ξ₁ лежит между a₁ и x₁;\nξ₂ лежит между a₂ и x₂.',y=-.25,color=CYAN)
        for q,d,col in [((.625,.1),(1,0),GOLD),((1.05,.425),(0,1),CYAN)]:
            pts=[]
            for t in [-.24,.24]:
                xx,yy=q[0]+t*d[0],q[1]+t*d[1]
                z=f(*q)+t*(2*q[0]*d[0]+4*q[1]*d[1])
                pts.append(P((xx,yy,z+.015)))
            line(s,pts,col,.017); dot(s,P((*q,f(*q)+.01)),col)
    else:
        note(s,'НЕПРЕРЫВНОСТЬ ДАЁТ МАЛУЮ ОШИБКУ','ε₁(x) = f′ₓ₁(ξ₁,a₂) − f′ₓ₁(a)\nε₂(x) = f′ₓ₂(x₁,ξ₂) − f′ₓ₂(a)','Обе εₖ(x) → 0 при x → a:\nпромежуточные точки тоже идут к a.',y=2.65)
        note(s,'ПОСЛЕ ВЫЧИТАНИЯ ЛИНЕЙНОЙ ЧАСТИ','r = ε₁(x)(x₁−a₁) + ε₂(x)(x₂−a₂)\n|r|/‖x−a‖ ≤ |ε₁(x)| + |ε₂(x)|','Каждая координата по модулю ≤ ‖x−a‖.\nПравая часть → 0: это дифференцируемость.',y=-.5,color=RED)
    return s

def scene3(radius,key):
    s=board(key,'Композиция: сначала F′, затем G′','3.2.5  /  F дифференцируемо в a; G — в b = F(a); обе точки внутренние',wide=True)
    F=lambda x,y:(x+.5*y+.3*y*y,.2*x+y+.25*x*x)
    G=lambda u,v:(1.1*u+.6*v+.2*v*v,-.3*u+.9*v+.15*u*u)
    A=lambda x,y:(x+.5*y,.2*x+y)
    B=lambda u,v:(1.1*u+.6*v,-.3*u+.9*v)
    maps=[lambda x,y:(x,y),F,lambda x,y:G(*F(x,y))]
    linear=[lambda x,y:(x,y),A,lambda x,y:B(*A(x,y))]
    centers=[-6.4,-.2,5.8]
    for cx,fun,lin,label in zip(centers,maps,linear,['h ∈ R²','K = F(a+h) − F(a)','G(b+K) − G(b)']):
        P=lambda q:(cx+1.2*q[0]/radius,.45+1.2*q[1]/radius,0)
        for i in range(9):
            t=radius*(-.85+1.7*i/8)
            for swap in [False,True]:
                pts=[]
                for j in range(41):
                    u=radius*(-.85+1.7*j/40)
                    pts.append(P(fun(t,u) if swap else fun(u,t)))
                line(s,pts,CYAN,.011)
        for i in [-1,1]:
            for swap in [False,True]:
                qs=[(i*.85*radius,j*.85*radius) if swap else (j*.85*radius,i*.85*radius) for j in [-1,1]]
                line(s,[(*P(lin(*q))[:2],.08) for q in qs],GOLD,.019)
        h=(.5*radius,.3*radius); real=P(fun(*h)); approx=P(lin(*h)); start=(cx,.45,.16)
        arrow(s,start,(*approx[:2],.16),GOLD,.028)
        dot(s,(*real[:2],.2),CYAN,.052)
        line(s,[(*real[:2],.15),(*approx[:2],.15)],RED,.028)
        text(s,label,cx-2,2.65,.28)
        text(s,['a = 0','b = F(a) = 0','G(b) = 0'][centers.index(cx)],cx-1,-1.53,.24,MUTED)
    text(s,'F',-3.5,.6,.36,GOLD); text(s,'G',2.9,.6,.36,GOLD)
    text(s,'Нелинейная сетка — бирюзовая; линейный образ границы — жёлтый',-9.1,-2.35,.24,MUTED)
    text(s,'Радиус: '+str(radius)+'; изображения увеличены в 1/r раз',-9.1,-2.82,.24,CYAN)
    text(s,"(G ∘ F)′(a)h = G′(b)(F′(a)h)",-9.1,-3.55,.36)
    text(s,'F(x,y) = (x + ½y + 0.3y², 0.2x + y + ¼x²)',-9.1,-4.25,.23,MUTED)
    text(s,'G(u,v) = (1.1u + 0.6v + 0.2v², −0.3u + 0.9v + 0.15u²)',-9.1,-4.68,.23,MUTED)
    text(s,'ПОЧЕМУ ОСТАТОК ОСТАЁТСЯ МАЛЫМ',2.1,-3.27,.21,RED)
    text(s,'‖K‖ ≤ C‖h‖;   o(‖K‖) = o(‖h‖)',2.1,-3.92,.28)
    text(s,'Разбор обоих остатков — следующий кадр.',2.1,-4.48,.23,MUTED)
    return s

def scene3_proof(key):
    s=board(key,'Композиция: куда исчезают оба остатка','3.2.5  /  Обозначения и оценка из лекционного доказательства')
    text(s,"A = F′(a);   B = G′(b);   b = F(a)",-9.1,2.6,.32,CYAN)
    text(s,'α(h) → 0;   β(K) → 0',-9.1,1.98,.30,MUTED)
    text(s,'ВНУТРЕННЕЕ ПРИРАЩЕНИЕ',-9.1,.98,.23,GOLD)
    text(s,'K = Ah + α(h)‖h‖',-9.1,.29,.40)
    text(s,'‖K‖ ≤ (Cₐ + ‖α(h)‖)‖h‖',-9.1,-.4,.31)
    arrow(s,(-5,-.85,9),(-5,-1.45,9),GOLD)
    text(s,'ВНЕШНЕЕ РАЗЛОЖЕНИЕ',-9.1,-2.05,.23,GOLD)
    text(s,'G(b+K) = G(b) + BK + β(K)‖K‖',-9.1,-2.75,.32)
    text(s,'Cₐ, Cᵦ — константы оценки нормы операторов.',-9.1,-4.25,.24,MUTED)
    note(s,'ПОСЛЕ ПОДСТАНОВКИ K','G(F(a+h)) = G(b) + BAh + r(h)\nr(h) = Bα(h)‖h‖ + β(K)‖K‖','Остаётся доказать: r(h) = o(‖h‖).',y=2.65)
    text(s,'ДЕЛИМ ОЦЕНКУ НА ‖h‖',1.75,-.55,.23,RED)
    text(s,'‖r(h)‖ / ‖h‖ ≤',1.75,-1.23,.34)
    text(s,'Cᵦ‖α(h)‖ + ‖β(K)‖(Cₐ + ‖α(h)‖)',1.75,-1.88,.30)
    text(s,'Оба слагаемых → 0.\nПроизводный оператор композиции — BA.',1.75,-2.78,.26,MUTED)
    text(s,'В нуле полагаем α(0) = β(0) = 0.',1.75,-4.2,.24,MUTED)
    return s

def scene4(stage,key):
    if stage==2:
        s=board(key,'Векторное равенство Лагранжа неверно','3.2.7  /  Контрпример из лекции 14: полный обход окружности')
        C=(-5,-.8); rr=2.3
        line(s,[(C[0]+rr*math.cos(t*math.tau/150),C[1]+rr*math.sin(t*math.tau/150),0) for t in range(151)],CYAN,.035)
        for t in [.4,1.8,3.1,4.5,5.8]:
            p=(C[0]+rr*math.cos(t),C[1]+rr*math.sin(t),.1)
            arrow(s,p,(p[0]-math.sin(t),p[1]+math.cos(t),.1),GOLD)
        dot(s,(C[0]+rr,C[1],.2),RED,.10)
        text(s,'F(0) = F(2π)',-3.9,-1.35,.27,RED)
        text(s,'Жёлтые стрелки — ненулевые скорости',-9,-4.48,.24,MUTED)
        note(s,'ЗАМКНУТЫЙ ПУТЬ','F(t) = (cos t, sin t)\nt ∈ [0, 2π]','F(2π) − F(0) = 0.',y=2.65)
        note(s,'СКОРОСТЬ НИГДЕ НЕ НУЛЕВАЯ','F′(t) = (−sin t, cos t)\n‖F′(t)‖ = 1','0 = F′(c) · 2π невозможно.\nОценка нормы 0 ≤ 2π остаётся верной.',y=-.5,color=RED)
        return s
    s=board(key,'Векторная Лагранжа: спроецировать на хорду','3.2.7  /  F ∈ C[a,b], F дифференцируемо на (a,b)')
    F=lambda t:(math.cos(t),math.sin(t),.4*t)
    P=lambda p:project(p,center=(-5,-1.5,0),scale=2.0)
    a=0; b=math.pi; c=math.pi/4; v=Vector(F(b))-Vector(F(a))
    line(s,[P(F(i*b/120)) for i in range(121)],CYAN,.034)
    arrow(s,P(F(a)),P(F(b)),GOLD,.034)
    for t,label in [(a,'F(a)'),(b,'F(b)'),(c,'F(c)')]:
        q=P(F(t)); dot(s,q); text(s,label,q[0]+.12,q[1]+.15,.26)
    velocity=Vector((-math.sin(c),math.cos(c),.4)); projection=v*(velocity.dot(v)/v.length_squared)
    # Same display scale for velocity and its orthogonal projection.
    start=Vector(F(c)); tip=start+velocity; foot=start+projection
    arrow(s,P(start),P(tip),PURPLE,.035); arrow(s,P(start),P(foot),RED,.027)
    line(s,[P(tip),P(foot)],MUTED,.011)
    text(s,'Хорда — жёлтая; скорость — фиолетовая',-9,-4.05,.23,MUTED)
    text(s,'Красная стрелка — проекция скорости на хорду',-9,-4.48,.23,MUTED)
    note(s,'ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ','v = F(b) − F(a)\nφ(t) = ⟨v, F(t) − F(a)⟩','φ(a) = 0;   φ(b) = ‖v‖².\nБерём компоненту вдоль фиксированной хорды.',y=2.65)
    note(s,'СКАЛЯРНАЯ ЛАГРАНЖА + КБШ','‖v‖² = ⟨v, F′(c)⟩(b−a)\n≤ ‖v‖ · ‖F′(c)‖ · |b−a|','Если v ≠ 0, сокращаем на ‖v‖.\nЕсли v = 0, оценка уже верна.',y=-.55,color=RED)
    # Illustrated speed is generic: the theorem's existential c is not chosen on the plot.
    for o in s.objects:
        if o.type=='FONT' and o.data.body=='F(c)': o.data.body='F(t)'
    text(s,'На рисунке — произвольное t, не точка c из теоремы.',-9,2.65,.22,CYAN)
    return s

def scene5(stage,key):
    s=board(key,'Градиент: наклон определяется проекцией','3.1.12–13 · 3.2.8  /  f дифференцируема в a; ‖u‖ = 1; ∇f(a) ≠ 0','ДОПОЛНИТЕЛЬНО')
    f=lambda x,y:x*x+2*y*y
    if stage==1:
        P=lambda p:project(p,center=(-6.7,-2.8,0),scale=1.7)
        graph(s,f,P,0,1.1); axes(s,P,1.5)
        a=(.5,.25); pa=P((*a,f(*a)))
        for u,col in [((1/math.sqrt(2),1/math.sqrt(2)),GOLD),((1/math.sqrt(2),-1/math.sqrt(2)),PURPLE)]:
            pts=[]
            for i in range(61):
                t=-.3+.6*i/60; x=a[0]+t*u[0]; y=a[1]+t*u[1]
                pts.append(P((x,y,f(x,y)+.008)))
            line(s,pts,col,.03)
            arrow(s,P((*a,0)),P((a[0]+.5*u[0],a[1]+.5*u[1],0)),col)
        dot(s,pa); text(s,'a',pa[0]-.25,pa[1]-.32,.25)
        text(s,'Жёлтое сечение: максимальный наклон в a',-9,-4.05,.23,MUTED)
        text(s,'Фиолетовое: наклон в a равен нулю',-9,-4.48,.23,MUTED)
    else:
        P=lambda q:(-5.3+2.6*q[0],-1.3+2.6*q[1],0)
        a=(.5,.25); pa=P(a)
        for level in [.12,.375,.75,1.25]:
            line(s,[P((math.sqrt(level)*math.cos(i*math.tau/140),math.sqrt(level/2)*math.sin(i*math.tau/140))) for i in range(141)],GRID if level!=.375 else CYAN,.016)
        dot(s,pa,WHITE)
        for u,col in [((.707,.707),GOLD),((.707,-.707),PURPLE),((-.707,-.707),RED)]:
            arrow(s,pa,P((a[0]+.65*u[0],a[1]+.65*u[1])),col,.03)
        text(s,'∇f(a)',-3.2,1.15,.30,GOLD)
        text(s,'Нулевая производная',-3.6,-2.05,.23,PURPLE)
        text(s,'Линии уровня x² + 2y² = const',-9,2.65,.26,CYAN)
        text(s,'Градиент лежит в плоскости аргументов.',-9,-4.05,.23,MUTED)
        text(s,'Он перпендикулярен касательной к линии уровня.',-9,-4.48,.23,MUTED)
    note(s,'ПРОИЗВОДНАЯ ПО ЕДИНИЧНОМУ НАПРАВЛЕНИЮ','∂ᵤf(a) = ⟨∇f(a), u⟩\n= ‖∇f(a)‖ cos θ','f(x,y) = x² + 2y²;  a = (½, ¼).\n∇f(a) = (1,1);   ‖∇f(a)‖ = √2.',y=2.65)
    note(s,'ТРИ НАПРАВЛЕНИЯ','u = (1,1)/√2       →   √2\nu = (1,−1)/√2      →   0\nu = (−1,−1)/√2    →  −√2','',y=-.55)
    text(s,'Ноль — только первый порядок,\nне постоянство функции вдоль прямой.',1.75,-3.9,.25,PURPLE)
    return s

def build_all():
    scenes=[]
    for radius,key in [(.65,'01a_local_model'),(.2,'01b_local_zoom'),(.06,'01c_local_limit')]: scenes.append(scene1(radius,key))
    scenes.extend([scene2(1,'02a_staircase'),scene2(2,'02b_remainder')])
    scenes.extend([scene3(.8,'03a_composition'),scene3(.15,'03b_composition_zoom')])
    scenes.append(scene3_proof('03c_composition_remainder'))
    scenes.extend([scene4(1,'04a_projection'),scene4(2,'04b_circle')])
    scenes.extend([scene5(1,'05a_gradient_surface'),scene5(2,'05b_gradient_levels')])
    return scenes

def render_queue(scenes):
    keys=[s.name for s in scenes]
    state={'pending':keys.copy(),'done':[],'error':None}
    status=os.path.join(OUT,'render_status.json')
    def tick():
        if not state['pending']: return None
        name=state['pending'].pop(0)
        try:
            bpy.ops.render.render(write_still=True,scene=name)
            state['done'].append(name)
        except Exception as e:
            state['error']=str(e)
        with open(status,'w') as f: json.dump(state,f,ensure_ascii=False,indent=2)
        return 1.0 if state['pending'] and not state['error'] else None
    bpy.app.timers.register(tick,first_interval=1)
    return state

if __name__=='__main__':
    build_all()
