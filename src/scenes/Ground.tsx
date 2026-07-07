import React from 'react'

/**
 * Simple ground plane that receives shadows.
 * Provides a visual floor for the character.
 */
export default function Ground() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial
        color="#1a1a2e"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  )
}
