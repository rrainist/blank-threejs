var three = THREE.Bootstrap({
  plugins: ['core']
});

var cube = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff3333 }));

three.scene.add(cube);

three.camera.position.set(1, 1, 2);
three.camera.lookAt(new THREE.Vector3(0, 0, 0));

// three.on('update', function () {
// do something
// });