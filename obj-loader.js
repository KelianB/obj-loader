/** Creates an instance of OBJLoader that will be able to load any amount of .obj files.
 * @param {Object} parameters - The parameters used for initializing the OBJLoader.
 * @param {OBJLoader.onModelLoaded} parameters.onModelLoaded - A function that will be called when a model has finished loading.
 * @param {OBJLoader.onNewMesh} parameters.onNewMesh - A function that will be called when the parser has encountered a mesh declaration.
 * @param {OBJLoader.onNewMaterial} parameters.onNewMaterial - A function that will be called when the parser has encountered a material call.
 * @param {OBJLoader.onComment} parameters.onComment - A function that will be called when the parser has encountered a comment.
 * @param {OBJLoader.onLoadingProgress} parameters.onLoadingProgress - A function that will be called when progress has been made while loading the object file.
 * @param {Object} parameters.defaultMaterial - The default rendering material for the loaded models.
 * @class
 * @classdesc A utility class designed to help loading 3D models in the obj format to use with the THREE.js library.
   This helper does not implement all features and specifics of the OBJ format, as it was mainly designed for parsing models from Guild Wars 2.
 */
function OBJLoader(parameters) {
	var that = this;

	this.parameters = parameters;

	/** @callback OBJLoader.onModelLoaded
	 * @param {THREE.Object3D} loadedModel - The model that has been loaded and parsed.
	 */
	this.parameters.onModelLoaded = parameters.onModelLoaded || function() {};

	/** @callback OBJLoader.onNewMesh
	 * @param {Mesh} mesh - The new mesh.
	 * @param {Integer} meshes - The total amount of meshes that have been parsed, including this new one.
	 */
	this.parameters.onNewMesh = parameters.onNewMesh || function() {};

	/** @callback OBJLoader.onNewMaterial
	 * @param {String} materialName - The name of the new material.
	 * @param {Mesh} mesh - The mesh to which the material belongs to.
	 */
	this.parameters.onNewMaterial = parameters.onNewMaterial || function() {};

	/** @callback OBJLoader.onComment
	 * @param {String} comment - The commented line.
	 */
	this.parameters.onComment = parameters.onComment || function() {};

	/** @callback OBJLoader.onLoadingProgress
	 * @param {Number} progress - A number between 0 and 1 describing the current progress of loading the file (does not include parsing).
	 */
	this.parameters.onLoadingProgress = parameters.onLoadingProgress || function() {};

	/** Loads and parses an object file.
 	 * @param {Object} parameters - The parameters for loading the file.
	 * @param {String} [parameters.url] - The URL of the file we're loading.
	 * @param {String} [parameters.data] - The data of the file we're loading.
	 * @param {String} parameters.name - The name that will be given to the new model.
	 */
	this.loadFile = function(parameters) {
		var done = function(model) {
			model.defaultMaterial = that.defaultMaterial;
			model.name = parameters.name;
			that.parameters.onModelLoaded(model);
		};

		if(parameters.data) // Load model from text
			done(this.parse(parameters.data));
		else if(parameters.url) { // Load model from URL
			var onError = function(e) {
				console.error("[ObjLoader] Error while loading model.");
				console.error(e);
			};

			var onProgress = function(xhr) {
				if(xhr.lengthComputable)
					that.parameters.onLoadingProgress(xhr.loaded / xhr.total);
			};

			var loader = new THREE.XHRLoader(THREE.DefaultLoadingManager);
			loader.load(parameters.url, function(data) {
				done(that.parse(data));
			}, onProgress, onError);
		}
		else
			console.error("[ObjLoader] No URL or data provided for loading file.");
	};

	/** Parses the raw data of a model.
	 * @param {String} [data] - The raw data to parse.
	 */
	this.parse = function(data) {
		var object, geometry, material;
		var objects = [];

		var model = new THREE.Object3D();
		model.numVertices = 0;
		model.numFaces = 0;
		model.minX = 999999;
		model.minY = 999999;
		model.minZ = 999999;
		model.maxX = -999999;
		model.maxY = -999999;
		model.maxZ = -999999;

		var totalX = 0, totalY = 0, totalZ = 0;

		function parseVertexIndex(value) {
			var index = parseInt(value);
			return (index >= 0 ? index - 1 : index + vertices.length / 3) * 3;
		}
		function parseNormalIndex(value) {
			var index = parseInt(value);
			return (index >= 0 ? index - 1 : index + normals.length / 3) * 3;
		}
		function parseUVIndex(value) {
			var index = parseInt(value);
			return (index >= 0 ? index - 1 : index + uvs.length / 2) * 2;
		}
		function addVertex(a, b, c) {
			geometry.vertices.push(
				vertices[a], vertices[a + 1], vertices[a + 2],
				vertices[b], vertices[b + 1], vertices[b + 2],
				vertices[c], vertices[c + 1], vertices[c + 2]
			);
		}
		function addNormal(a, b, c) {
			geometry.normals.push(
				normals[a], normals[a + 1], normals[a + 2],
				normals[b], normals[b + 1], normals[b + 2],
				normals[c], normals[c + 1], normals[c + 2]
			);
		}
		function addUV(a, b, c) {
			geometry.uvs.push(
				uvs[a], uvs[a + 1],
				uvs[b], uvs[b + 1],
				uvs[c], uvs[c + 1]
			);
		}
		function addFace(a, b, c, d,  ua, ub, uc, ud, na, nb, nc, nd) {
			// a, b, c, d: vertex indexes
			// ua, ub, uc, ud: uv indexes
			// na, nb, nc, nd: normal indexes

			var ia = parseVertexIndex(a);
			var ib = parseVertexIndex(b);
			var ic = parseVertexIndex(c);
			var id;

			// Vertices
			if(d === undefined)
				addVertex(ia, ib, ic);
			else {
				id = parseVertexIndex(d);
				addVertex(ia, ib, id);
				addVertex(ib, ic, id);
			}

			// UV
			if(ua !== undefined) {
				ia = parseUVIndex(ua);
				ib = parseUVIndex(ub);
				ic = parseUVIndex(uc);

				if(d === undefined)
					addUV(ia, ib, ic);
				else {
					id = parseUVIndex(ud);
					addUV(ia, ib, id);
					addUV(ib, ic, id);
				}
			}

			// Normals
			if(na !== undefined) {
				ia = parseNormalIndex(na);
				ib = parseNormalIndex(nb);
				ic = parseNormalIndex(nc);

				if(d === undefined)
					addNormal(ia, ib, ic);
				else {
					id = parseNormalIndex(nd);
					addNormal(ia, ib, id);
					addNormal(ib, ic, id);
				}
			}

			model.numFaces++;
			object.numFaces++;
		}

		function newObject() {
			geometry = {vertices: [], normals: [], uvs: []};
			object = {geometry: geometry, material: parameters.defaultMaterial, numVertices: 0, numFaces: 0};
			objects.push(object);
			parameters.onNewMesh(object, objects.length);
		}

		function addVertice(x, y, z) {
			if(!object)
				newObject();

			vertices.push(x, y, z);
			model.numVertices++;
			object.numVertices++;
			totalX += x;
			totalY += y;
			totalZ += z;

			if(x < model.minX)
				model.minX = x;
			if(y < model.minY)
				model.minY = y;
			if(z < model.minZ)
				model.minZ = z;

			if(x > model.maxX)
				model.maxX = x;
			if(y > model.maxY)
				model.maxY = y;
			if(z > model.maxZ)
				model.maxZ = z;
		}

		var vertices = [];
		var normals = [];
		var uvs = [];

		var patterns = {
			vertex: /v( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/, // v float float float
			normals: /vn( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/, // vn float float float
			uv: /vt( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/, // vt float float
			face1: /f( +-?\d+)( +-?\d+)( +-?\d+)( +-?\d+)?/, // f vertex vertex vertex vertex
			face2: /f( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))?/, // f vertex/uv vertex/uv vertex/uv vertex/uv
			face3: /f( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))?/, // f vertex/uv/normal vertex/uv/normal vertex/uv/normal vertex/uv/normal
			face4: /f( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))?/ // f vertex//normal vertex//normal vertex//normal vertex//normal
		};

		var lines = data.split("\n");


		for(var i = 0; i < lines.length; i ++) {
			var line = lines[i].trim();

			var result;

			if(line.length === 0) // Empty line or comment
				continue;
			if(line.charAt(0) === "#")
				parameters.onComment(line);
			else if(/^g /.test(line)) { // Polygon group
				newObject();
				object.name = line.substring(2).trim();
			}
			else if((result = patterns.vertex.exec(line)) !== null) // Vertice
				addVertice(parseFloat(result[1]), parseFloat(result[2]), parseFloat(result[3]));
			else if((result = patterns.normals.exec(line)) !== null) // Normals
				normals.push(parseFloat(result[1]), parseFloat(result[2]), parseFloat(result[3]));
			else if((result = patterns.uv.exec(line)) !== null) // UV
				uvs.push(parseFloat(result[1]), 1 - parseFloat(result[2]));
			else if((result = patterns.face1.exec(line)) !== null) // Face (pattern 1)
				addFace(result[1], result[2], result[3], result[4]);
			else if((result = patterns.face2.exec(line)) !== null) // Face (pattern 2)
				addFace(result[2], result[5], result[8], result[11], result[3], result[6], result[9], result[12]);
			else if((result = patterns.face3.exec(line)) !== null) // Face (pattern 3)
				addFace(result[2], result[6], result[10], result[14], result[3], result[7], result[11], result[15], result[4], result[8], result[12], result[16]);
			else if((result = patterns.face4.exec(line)) !== null) // Face (pattern 4)
				addFace(result[2], result[5], result[8], result[11], undefined, undefined, undefined, undefined, result[3], result[6], result[9], result[12]);
			else if(/^o /.test(line)) { // Object

			}
			else if(/^usemtl/.test(line)) { // Material
				object.materialName = line.substring(7).trim();
				parameters.onNewMaterial(object.materialName, object);
			}
			else if(/^mtllib /.test(line)) { // MTL File

			}
			else if(/^s /.test(line)) { // Smooth shading

			}
			else {
				console.log("[ObjLoader] Line not parsed: " + line);
			}
		}

		model.midX = totalX / model.numVertices;
		model.midY = totalY / model.numVertices;
		model.midZ = totalZ / model.numVertices;

		for(var i = 0; i < objects.length; i ++) {
			var obj = objects[i];

			var xyz = 0;
			for(var j = 0; j < obj.geometry.vertices.length; j++) {
				if(xyz == 0)
					obj.geometry.vertices[j] -= model.midX;
				else if(xyz == 1)
					obj.geometry.vertices[j] -= model.midY;
				else if(xyz == 2)
					obj.geometry.vertices[j] -= model.maxZ;
				xyz++;
				xyz %= 3;
			}

			// Create BufferGeometry
			var bufferGeometry = new THREE.BufferGeometry();

			// Add vertices
			bufferGeometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(obj.geometry.vertices), 3));

			// Add normals
			if(obj.geometry.normals.length > 0)
				bufferGeometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(obj.geometry.normals), 3));

			// Add UVs
			if(obj.geometry.uvs.length > 0)
				bufferGeometry.addAttribute("uv", new THREE.BufferAttribute(new Float32Array(obj.geometry.uvs), 2));

			// Build mesh
			var mesh = new THREE.Mesh(bufferGeometry, obj.material || parameters.defaultMaterial);
			mesh.numVertices = obj.numVertices;
			mesh.numFaces = obj.numFaces;
			mesh.materialName = obj.materialName;
			mesh.name = obj.name;

			mesh.rotation.x = Math.PI / 2;
			mesh.rotation.z = Math.PI;

			mesh.geometry.computeFaceNormals();
			mesh.geometry.computeVertexNormals();

			model.add(mesh);
		}

		model.setMaterial = function(material) {
			for(var i = 0; i < this.children.length; i++)
				this.children[i].material = material;
		};

		return model;
	};
}
