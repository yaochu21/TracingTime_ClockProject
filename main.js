import * as THREE from 'three';
import { Layers } from 'three';
import { Vector3 } from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';
// import {NodeArray,Clock} from 'classes.js';

//#region scene setup
const bgColor = new THREE.Color(0xfefefe);
const my_scene = new THREE.Scene();
my_scene.background = bgColor;

const width = 500;
const height = 250;
const near = 1;
const far = 100;
const camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, near, far );
camera.position.z = 10;
my_scene.add( camera );

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
//#endregion

//#region materials
const material_black = new THREE.MeshBasicMaterial({
    color: 0x0
});

const material_blue = new THREE.MeshBasicMaterial({
    color: 0x55ccdd
})

const material_grey = new THREE.MeshBasicMaterial({
    color: 0x8a8a8a
})

const material_bg = new THREE.MeshBasicMaterial({
    color: bgColor,
})
const material_line_black = new THREE.LineBasicMaterial( { color: 0x00, linewidth: 0.5 } );
//#endregion

//#region classes
function borderedCircle(x,y,radius,thickness=0.5,outline_material=material_black,face_material=material_bg) {
    const circleIn = new THREE.Shape();
    const circleOut = new THREE.Shape();
    circleIn.absarc(0, 0, radius);
    circleOut.absarc(0, 0, radius+thickness);
    const segments = 200;
    const geometry_1 = new THREE.ShapeGeometry(circleIn, segments / 2);
    const geometry_2 = new THREE.ShapeGeometry(circleOut, segments / 2);

    const mesh_1 = new THREE.Mesh(geometry_1, face_material);
    const mesh_2 = new THREE.Mesh(geometry_2, outline_material);
    mesh_1.position.set(x,y,0);
    mesh_2.position.set(x,y,0);

    return [mesh_1,mesh_2]
}

function circle(x,y,r) {
    const geometry = new THREE.CircleGeometry( r, 32 ); 
    const circle = new THREE.Mesh( geometry, material_black );
    circle.position.set(x,y,0);
    return circle;
}

function arrow(start_x,start_y,pos_x,pos_y,dir,dist,material=material_line_black,z = 0,) {
    const points = [];
    const o = new THREE.Vector3( start_x, start_y, z )
    const end = new THREE.Vector3(start_x, start_y, z).addScaledVector(dir.normalize(),dist);
    points.push( o );
    points.push(end);

    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry, material );
    line.position.set(pos_x,pos_y,z);
    return line;
}

class Clock {
    constructor(scene,pos_x,pos_y,radius,border_width=0.5,factor=60,speed_second=0.005,speed_minute=null,speed_hour=null) {
        this.pos_x = pos_x;
        this.pos_y = pos_y;
        this.radius = radius;
        this.border_width = border_width;
        this.speed_second = speed_second;
        this.speed_minute = speed_minute ? speed_minute : this.speed_second / factor;
        this.speed_hour = speed_hour ? speed_hour : this.speed_minute / factor;
        this.dst_clocks = [];
        this.src_clocks = [];
        this.scene = scene;
        this.Instantiate();
    }

    Instantiate() {
        const [in_circle,out_circle] = borderedCircle(this.pos_x,this.pos_y,this.radius,this.border_width);
        const hour = arrow(0,0,this.pos_x,this.pos_y,new THREE.Vector3(1,1,0),this.radius / 2);
        const minute = arrow(0,0,this.pos_x,this.pos_y,new THREE.Vector3(0,1,0),this.radius * 3 / 4);
        const second = arrow(-this.radius/10,-this.radius/10,this.pos_x,this.pos_y,new THREE.Vector3(1,1,0),this.radius);
        const dot = circle(this.pos_x,this.pos_y,0.7 * this.radius / 40);
        dot.renderOrder = 1;

        this.hourhand = hour;
        this.minutehand = minute;
        this.secondhand = second;
        this.dot = dot;
        this.in_circle = in_circle;
        this.out_circle = out_circle;

        const group = new THREE.Group();
        group.add(hour);
        group.add(minute);
        group.add(second);
        group.add(out_circle);
        group.add(dot);
        my_scene.add(group);
        this.group = group;
        this.in_circle.add(group);
        this.scene.add(this.in_circle);
    }

    Tick() {
        this.hourhand.rotateZ(this.speed_hour);
        this.minutehand.rotateZ(this.speed_minute);
        this.secondhand.rotateZ(this.speed_second);
    }

    Decelerate() {

    }

    Accelerate() {

    }

    Repulsion() {

    }
}

class NodeArray {
    constructor(scene,clock,count = 1, offset = 4,size = 1.5, material = material_grey ,material_hover = material_blue, start_angle = 0,) {
        this.clock = clock;
        this.offset = offset;
        this.count = count;
        this.size = size;
        this.material = material;
        this.material_hover = material_hover;
        this.start_angle = start_angle;
        this.scene = scene;
        this.Instantiate();
    }

    Instantiate() {
        const x = this.clock.radius + this.clock.border_width + this.offset;
        const segments = 100;
        const angle_offset = 2*Math.PI / this.count;
        for (var i = 0; i < this.count; i++) {
            const circle = new THREE.Shape();
            circle.absarc(x,0,this.size);
            const geometry = new THREE.ShapeGeometry(circle,segments/2);
            const mesh = new THREE.Mesh(geometry,this.material);
            mesh.rotateZ(angle_offset*i);
            mesh.userData = this;
            this.clock.in_circle.add(mesh)
        }
    }
}
//#endregion

var clicked = []
var NODELAYER = 5;
const pointer = new THREE.Vector2();
const nodeRaycaster = new THREE.Raycaster();
nodeRaycaster.layers.set(NODELAYER);

function onPointerMove( event ) {

	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function onPointerClick( event ) {
    nodeRaycaster.setFromCamera( pointer, camera );
    const intersects = nodeRaycaster.intersectObjects( my_scene.children );
    
    if (clicked.length >= 2) {
        clicked = []
    }
    clicked.push(intersects[i]);
    console.log(clicked);
}


//#region main
const clock = new Clock(my_scene,0,0,40,0.5,10,0.008);
const node_arr = new NodeArray(my_scene,clock,2);

const controls = new DragControls( [clock.in_circle], camera, renderer.domElement );
controls.recursive = false;

function draw() {
	requestAnimationFrame( draw );

    clock.Tick();

	renderer.render( my_scene, camera );
}
draw();

window.addEventListener( 'pointermove', onPointerMove );
window.addEventListener('pointerdown', onPointerClick);

//#endregion