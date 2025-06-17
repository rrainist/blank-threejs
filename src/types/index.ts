import * as THREE from 'three';

export interface Transform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface RigidBody {
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
}

export interface Collider {
  radius: number;
}

export interface IEntity {
  id: string;
  transform: Transform;
  rigidbody: RigidBody;
  collider: Collider;
  
  update(deltaTime: number): void;
  destroy(): void;
} 