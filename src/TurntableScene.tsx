import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, ContactShadows, Environment, useGLTF } from '@react-three/drei'
import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Box3, CanvasTexture, CircleGeometry, Color, DoubleSide, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, SRGBColorSpace, Vector3 } from 'three'
import turntableModelUrl from '../turntable_LD.glb?url'

type TurntableSceneProps = {
  recordRotationRef: MutableRefObject<number>
  animationActive: boolean
  trackProgress: number
  hasTrack: boolean
  needleEngaged: boolean
  pitchSemitones: number
  labelTitle: string
  accentColor: string
}

const createLabelPalette = (accentColor: string) => {
  const accent = new Color(accentColor)
  const light = accent.clone().lerp(new Color('#fff6df'), .3)
  const dark = accent.clone().lerp(new Color('#160a06'), .43)
  const ink = accent.clone().lerp(new Color('#080605'), .76)
  return { light: light.getStyle(), accent: accent.getStyle(), dark: dark.getStyle(), ink: ink.getStyle() }
}

const createLabelTexture = (title: string, accentColor: string) => {
  const palette = createLabelPalette(accentColor)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1024
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(330, 260, 35, 512, 512, 560)
  gradient.addColorStop(0, palette.light)
  gradient.addColorStop(.72, palette.accent)
  gradient.addColorStop(1, palette.dark)
  context.fillStyle = gradient
  context.fillRect(0, 0, 1024, 1024)
  context.strokeStyle = palette.ink
  context.lineWidth = 12
  context.beginPath()
  context.arc(512, 512, 408, 0, Math.PI * 2)
  context.stroke()
  context.beginPath()
  context.arc(512, 512, 354, 0, Math.PI * 2)
  context.stroke()

  const cleanTitle = title.replace(/\.[a-z0-9]+$/i, '').toUpperCase()
  const words = cleanTitle.split(/\s+/)
  const lines = ['', '', '']
  let line = 0
  words.forEach((word) => {
    const candidate = `${lines[line]} ${word}`.trim()
    if (candidate.length > 18 && line < lines.length - 1) line += 1
    lines[line] = `${lines[line]} ${word}`.trim()
  })
  const visibleLines = lines.filter(Boolean).slice(0, 3)
  const size = visibleLines.length > 2 ? 44 : visibleLines.length > 1 ? 54 : 62
  context.fillStyle = palette.ink
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `700 ${size}px "DM Mono", monospace`
  const lineHeight = size * 1.18
  const startY = 472 - ((visibleLines.length - 1) * lineHeight) / 2
  visibleLines.forEach((text, index) => context.fillText(text, 512, startY + index * lineHeight, 680))
  context.font = '600 38px "DM Mono", monospace'
  context.fillText('33⅓ RPM', 512, 676)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

const createPivot = (parent: Object3D, parts: Object3D[], centre: Vector3) => {
  const pivot = new Group()
  parent.add(pivot)
  pivot.position.copy(parent.worldToLocal(centre))
  parts.forEach((part) => pivot.attach(part))
  return pivot
}

function CameraAim() {
  const { camera } = useThree()
  useEffect(() => { camera.lookAt(0, 0, 0) }, [camera])
  return null
}

function AnimatedModel({ recordRotationRef, animationActive, trackProgress, hasTrack, needleEngaged, pitchSemitones, labelTitle, accentColor }: TurntableSceneProps) {
  const { scene: sourceScene } = useGLTF(turntableModelUrl)
  const scene = useMemo(() => sourceScene.clone(true), [sourceScene])
  const labelTexture = useMemo(() => createLabelTexture(labelTitle, accentColor), [labelTitle, accentColor])
  const labelInk = useMemo(() => createLabelPalette(accentColor).ink, [accentColor])
  const platterPivot = useRef<Group | null>(null)
  const platterMesh = useRef<Object3D | null>(null)
  const tonearmPivot = useRef<Group | null>(null)
  const pitchFader = useRef<Object3D | null>(null)
  const pitchFaderOrigin = useRef<Vector3 | null>(null)

  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean; material?: MeshStandardMaterial | MeshStandardMaterial[] }
      if (!mesh.isMesh || !mesh.material) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const litMaterials = sourceMaterials.map((source) => {
        const material = source.clone()
        // Keep the baked texture maps, but lift them slightly so the dark deck
        // remains readable against this application's dim listening room.
        material.emissive.set('#000000')
        material.emissiveIntensity = 0
        material.envMapIntensity = .82
        material.needsUpdate = true
        return material
      })
      mesh.material = Array.isArray(mesh.material) ? litMaterials : litMaterials[0]
    })
    scene.updateMatrixWorld(true)

    // The low-poly MK2 asset exposes its platter as a distinct mesh, allowing
    // the visible record to follow playback and scratching.
    const platterParts = ['table_sm_turn_plade_mat_0']
      .map((name) => scene.getObjectByName(name))
      .filter((part): part is Object3D => Boolean(part))
    const platterParent = platterParts[0]?.parent
    if (platterParent && platterParts.length > 0) {
      const bounds = platterParts.reduce(
        (combined, part) => combined.union(new Box3().setFromObject(part)),
        new Box3(),
      )
      platterPivot.current = createPivot(platterParent, platterParts, bounds.getCenter(new Vector3()))
      platterMesh.current = platterParts[0]
    }

    // Only the moving portion of the tonearm is attached to this pivot; its
    // base and rest remain fixed to the deck.
    const armParts = ['arm_msh', 'needle_system_msh', 'needle_msh', 'turner_msh']
      .map((name) => scene.getObjectByName(name))
      .filter((part): part is Object3D => Boolean(part))
    const armParent = armParts[0]?.parent
    if (armParent && armParts.length > 0) {
      const pivot = new Group()
      armParent.add(pivot)
      // The bearing position in the model's original FBX coordinate system.
      pivot.position.set(23, 17, 19.2)
      // The small perpendicular turner is mechanically part of the arm too,
      // so it must follow the tube and cartridge rather than stay behind.
      armParts.forEach((part) => pivot.attach(part))
      tonearmPivot.current = pivot
    }

    // `speed_sm` is the physical pitch fader cap on this MK2 model. Moving
    // its real mesh keeps the slider inside the model's perspective instead
    // of laying a flat HTML handle over the deck.
    const fader = scene.getObjectByName('speed_sm')
    if (fader) {
      pitchFader.current = fader
      pitchFaderOrigin.current = fader.position.clone()
    }
  }, [scene])

  useEffect(() => () => labelTexture.dispose(), [labelTexture])

  useEffect(() => {
    const platter = platterMesh.current
    if (!platter || !hasTrack) return
    const label = new Group()
    const labelMaterial = new MeshBasicMaterial({ map: labelTexture, side: DoubleSide })
    const labelDisc = new Mesh(new CircleGeometry(7.15, 96), labelMaterial)
    labelDisc.renderOrder = 2
    const spindleCover = new Mesh(
      new CircleGeometry(.48, 32),
      new MeshBasicMaterial({ color: labelInk, side: DoubleSide }),
    )
    spindleCover.position.z = .025
    spindleCover.renderOrder = 3
    label.add(labelDisc, spindleCover)
    // The platter mesh was exported offset from its parent, so the label must
    // use the geometry's own centre instead of the parent pivot's origin.
    label.position.set(-6.495, -.053, 17.045)
    platter.add(label)
    return () => {
      platter.remove(label)
      labelDisc.geometry.dispose()
      labelMaterial.dispose()
      ;(spindleCover.material as MeshBasicMaterial).dispose()
      spindleCover.geometry.dispose()
    }
  }, [hasTrack, labelInk, labelTexture])

  useFrame((state, delta) => {
    const phase = MathUtils.degToRad(recordRotationRef.current % 360)
    let needsNextFrame = animationActive
    if (platterPivot.current) {
      // The source model is authored in FBX coordinates. In its local space
      // the platter is an XY disc, so its normal is Z — rotating around Y was
      // tilting it like a wheel instead of spinning it on the deck.
      // Sub-pixel runout adds the barely perceptible, analog movement of a
      // real record without making the platter look unstable.
      platterPivot.current.rotation.set(
        Math.sin(phase * 1.7) * .0017,
        Math.cos(phase * 1.3) * .0011,
        phase,
      )
    }
    if (tonearmPivot.current) {
      // 0% sits just inside the lead-in groove, while 100% ends on the last
      // playable groove around the label instead of crossing over its centre.
      const targetAngle = needleEngaged ? MathUtils.lerp(-.215, -.52, trackProgress) : 0
      tonearmPivot.current.rotation.z = MathUtils.damp(tonearmPivot.current.rotation.z, targetAngle, 8, delta)
      needsNextFrame ||= Math.abs(tonearmPivot.current.rotation.z - targetAngle) > .0001
      // The arm rocks around its bearing: the cartridge follows the record
      // down while the counterweight above the bearing moves the other way.
      tonearmPivot.current.rotation.x = needleEngaged ? Math.sin(phase * 1.7) * .0045 : 0
      tonearmPivot.current.position.z = 19.2
    }
    if (pitchFader.current && pitchFaderOrigin.current) {
      const amount = MathUtils.clamp(pitchSemitones / 8, -1, 1)
      // In the model's authored axes, positive Y travels visually upward on
      // the pitch rail. Damping makes it feel like a weighted physical fader.
      const targetY = pitchFaderOrigin.current.y + amount * 7.8
      pitchFader.current.position.y = MathUtils.damp(pitchFader.current.position.y, targetY, 18, delta)
      needsNextFrame ||= Math.abs(pitchFader.current.position.y - targetY) > .0001
    }
    // The renderer sleeps completely while the deck is still. React prop
    // changes wake it, then the scene keeps only short mechanical settles
    // alive until their damped movement reaches the target.
    if (needsNextFrame) state.invalidate()
  })

  // This asset is exported in centimetre-like units, so it needs a small
  // conversion to fit the same listening-room scene.
  return <group position={[0, .16, 0]}><Center><group scale={.053}><primitive object={scene} /></group></Center></group>
}

export const TurntableScene = memo(function TurntableScene(props: TurntableSceneProps) {
  return <Canvas
    className="turntable-canvas"
    frameloop="demand"
    shadows
    dpr={[1, 2]}
    camera={{ position: [0, 5.25, 4.25], fov: 32 }}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => { gl.toneMappingExposure = .84 }}
  >
    <CameraAim />
    <ambientLight intensity={.5} color="#fff9ed" />
    <hemisphereLight intensity={.34} color="#fff8ef" groundColor="#30231a" />
    <spotLight castShadow position={[1.3, 5.6, 4.2]} intensity={1.25} angle={.62} penumbra={.9} color="#fff2dc" shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-3, 4, 3]} intensity={.7} color="#dce8ff" />
    <Environment preset="warehouse" environmentIntensity={.78} />
    <Suspense fallback={null}><AnimatedModel {...props} /></Suspense>
    <ContactShadows frames={1} position={[0, -.66, 0]} opacity={.38} scale={6.2} blur={2.8} far={3.5} color="#100905" />
  </Canvas>
})

useGLTF.preload(turntableModelUrl)
