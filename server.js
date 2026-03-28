const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")
const bodyParser = require("body-parser")
const multer = require("multer")

const app = express()

app.use(cors())
app.use(bodyParser.json())

app.use('/uploads', express.static('uploads'))
app.use('/tareas', express.static('tareas'))

// =============================
// CONEXIÓN MYSQL
// =============================

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
    rejectUnauthorized: false
  }
})

db.connect(err => {

if(err){
console.log("Error conexión MySQL", err)
}else{
console.log("Conectado a MySQL")
}

})

// =============================
// SUBIR FOTOS
// =============================

const storage = multer.diskStorage({

destination: function(req,file,cb){
cb(null,"uploads/")
},

filename: function(req,file,cb){
cb(null, Date.now() + "-" + file.originalname)
}

})

const upload = multer({storage:storage})

// =============================
// SUBIR TAREAS
// =============================

const storageTareas = multer.diskStorage({

destination: function(req,file,cb){
cb(null,"tareas/")
},

filename: function(req,file,cb){
cb(null, Date.now() + "-" + file.originalname)
}

})

const uploadTarea = multer({storage:storageTareas})

// =============================
// LOGIN
// =============================

app.post("/login",(req,res)=>{

const {usuario,password} = req.body

const sqlAlumno = "SELECT * FROM alumnos WHERE usuario=? AND password=?"

db.query(sqlAlumno,[usuario,password],(err,alumnos)=>{

if(alumnos.length > 0){

return res.json({
mensaje:"Login correcto",
usuario: alumnos[0].usuario,
rol:"alumno",
alumno_id: alumnos[0].id,
papa_id: alumnos[0].papa_id
})

}

const sqlUsuarios = "SELECT * FROM usuarios WHERE correo=? AND password=?"

db.query(sqlUsuarios,[usuario,password],(err,usuarios)=>{

if(usuarios.length > 0){

return res.json({
mensaje:"Login correcto",
usuario: usuarios[0].correo,
rol: usuarios[0].rol,
maestro_id: usuarios[0].id
})

}

const sqlPapas = "SELECT * FROM papas WHERE usuario=? AND password=?"

db.query(sqlPapas,[usuario,password],(err,papas)=>{

if(papas.length > 0){

return res.json({
mensaje:"Login correcto",
usuario: papas[0].usuario,
rol:"padre",
papa_id: papas[0].id
})

}

res.json({mensaje:"Usuario o contraseña incorrectos"})

})

})

})

})

// =============================
// VER ALUMNOS
// =============================

app.get("/alumnos",(req,res)=>{

const sql = `
SELECT id,nombre,correo,grado,grupo,foto,papa_id,maestro_id
FROM alumnos
`

db.query(sql,(err,result)=>{

if(err){
console.log(err)
res.send(err)
}

})

})

// =============================
// CREAR ALUMNO
// =============================

app.post("/alumnos", upload.single("foto"), (req,res)=>{

const {nombre,correo,grado,grupo,papa_id,maestro_id} = req.body

const foto = req.file ? req.file.filename : null

const sql = `
INSERT INTO alumnos(nombre,correo,grado,grupo,foto,papa_id,maestro_id)
VALUES (?,?,?,?,?,?,?)
`

db.query(sql,[nombre,correo,grado,grupo,foto,papa_id,maestro_id],(err,result)=>{

if(err){
console.log(err)
res.send("Error al registrar alumno")
}else{
res.send("Alumno registrado")
}

})

})

// =============================
// CREAR USUARIO ALUMNO
// =============================

app.post("/admin/generar-usuarios",(req,res)=>{

const sql = "SELECT id,nombre FROM alumnos"

db.query(sql,(err,alumnos)=>{

if(err){
console.log(err)
return res.send("Error")
}

alumnos.forEach(alumno=>{

const usuario = alumno.nombre.replace(/\s+/g,"").toLowerCase()

const password = "1234"

const sqlUpdate = `
UPDATE alumnos
SET usuario=?, password=?
WHERE id=?
`

db.query(sqlUpdate,[usuario,password,alumno.id])

})

res.send("Usuarios generados correctamente")

})

})
// =============================
// VER INFO ALUMNO
// =============================

app.get("/alumno/:id",(req,res)=>{

const id = req.params.id

const sql = `
SELECT id,nombre,grado,grupo,foto
FROM alumnos
WHERE id=?
`

db.query(sql,[id],(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result[0])
}

})

})

// =============================
// OBTENER MAESTROS
// =============================

app.get("/maestros",(req,res)=>{

const sql = `
SELECT id,nombre
FROM usuarios
WHERE rol='maestro'
`

db.query(sql,(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result)
}

})

})

// =============================
// ASIGNAR MAESTRO
// =============================

app.post("/admin/asignar-maestro",(req,res)=>{

const { alumno_id, maestro_id } = req.body

const sql = `
UPDATE alumnos
SET maestro_id=?
WHERE id=?
`

db.query(sql,[maestro_id,alumno_id],(err,result)=>{

if(err){
console.log(err)
res.send("Error al asignar maestro")
}else{
res.send("Maestro asignado correctamente")
}

})

})

// =============================
// ALUMNOS DEL MAESTRO
// =============================

app.get("/maestro/alumnos/:id",(req,res)=>{

const maestro_id = req.params.id

const sql = `
SELECT id,nombre,grado,grupo,foto
FROM alumnos
WHERE maestro_id=?
`

db.query(sql,[maestro_id],(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result)
}

})

})

// =============================
// REGISTRAR ASISTENCIA
// =============================

app.post("/asistencias",(req,res)=>{

const {alumno_id, fecha, estado} = req.body

const sql = `
INSERT INTO asistencias(alumno_id, fecha, estado)
VALUES (?,?,?)
`

db.query(sql,[alumno_id,fecha,estado],(err,result)=>{

if(err){
console.log(err)
res.send("Error al guardar asistencia")
}else{
res.send("Asistencia registrada")
}

})

})

// =============================
// CALIFICACIONES DEL ALUMNO
// =============================

app.get("/calificaciones/:id",(req,res)=>{

const alumno_id = req.params.id

const sql = `
SELECT materia, calificacion
FROM calificaciones
WHERE alumno_id=?
`

db.query(sql,[alumno_id],(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result)
}

})

})

// =============================
// VER ASISTENCIAS DEL ALUMNO
// =============================

app.get("/asistencias/:id",(req,res)=>{

const alumno_id = req.params.id

const sql = `
SELECT fecha, estado
FROM asistencias
WHERE alumno_id=?
`

db.query(sql,[alumno_id],(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result)
}

})

})


// =============================
// VER TAREAS DEL ALUMNO (CON ENTREGAS)
// =============================

app.get("/tareas/:id",(req,res)=>{

const alumno_id = req.params.id

const sqlAlumno = "SELECT grado, grupo FROM alumnos WHERE id=?"

db.query(sqlAlumno,[alumno_id],(err,alumno)=>{

if(err){
console.log(err)
return res.send("Error")
}

if(alumno.length === 0){
return res.send("Alumno no encontrado")
}

const {grado, grupo} = alumno[0]

const sql = `
SELECT 
t.id,
t.titulo,
t.descripcion,
t.fecha,
e.archivo,
e.calificacion
FROM tareas t
LEFT JOIN entregas e 
ON t.id = e.tarea_id AND e.alumno_id = ?
WHERE t.grado=? AND t.grupo=?
`

db.query(sql,[alumno_id, grado, grupo],(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result)
}

})

})

})

// =============================
// REGISTRAR PAPÁ Y ASIGNAR ALUMNO
// =============================

app.post("/papas",(req,res)=>{

const {nombre,telefono,correo,alumno_id} = req.body

// 1️⃣ Insertar papá
const sqlPapa = `
INSERT INTO papas(nombre,telefono,correo)
VALUES (?,?,?)
`

db.query(sqlPapa,[nombre,telefono,correo],(err,result)=>{

if(err){
console.log(err)
return res.send("Error al registrar papá")
}

const papa_id = result.insertId

// 2️⃣ Asignar papá al alumno
const sqlAlumno = `
UPDATE alumnos
SET papa_id=?
WHERE id=?
`

db.query(sqlAlumno,[papa_id,alumno_id],(err2)=>{

if(err2){
console.log(err2)
res.send("Papá creado pero error al asignar alumno")
}else{
res.send("Papá registrado y asignado correctamente")
}

})

})

})

// =============================
// VER PAPÁS
// =============================

app.get("/papas",(req,res)=>{

const sql = `
SELECT * FROM papas
`

db.query(sql,(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result)
}

})

})

// =============================
// GENERAR USUARIOS PARA PAPÁS
// =============================

app.post("/admin/generar-usuarios-papas",(req,res)=>{

const sql = "SELECT id,nombre FROM papas"

db.query(sql,(err,papas)=>{

if(err){
console.log(err)
return res.send("Error")
}

papas.forEach(papa=>{

const usuario = papa.nombre.replace(/\s+/g,"").toLowerCase()
const password = "1234"

const sqlUpdate = `
UPDATE papas
SET usuario=?, password=?
WHERE id=?
`

db.query(sqlUpdate,[usuario,password,papa.id])

})

res.send("Usuarios de papás generados correctamente")

})

})

// =============================
// OBTENER HIJOS DEL PAPÁ
// =============================

app.get("/hijos/:id",(req,res)=>{

const papa_id = req.params.id

const sql = `
SELECT id,nombre,grado,grupo,foto
FROM alumnos
WHERE papa_id=?
`

db.query(sql,[papa_id],(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result)
}

})

})


// =============================
// GUARDAR CALIFICACIÓN
// =============================

app.post("/calificaciones",(req,res)=>{

const {alumno_id, materia, calificacion} = req.body

const sql = `
INSERT INTO calificaciones(alumno_id, materia, calificacion)
VALUES (?,?,?)
`

db.query(sql,[alumno_id,materia,calificacion],(err,result)=>{

if(err){
console.log(err)
res.send("Error al guardar calificación")
}else{
res.send("Calificación guardada")
}

})

})

// =============================
// CAMBIAR PASSWORD
// =============================

app.post("/cambiar-password",(req,res)=>{

const {usuario, nuevaPassword} = req.body

// ALUMNOS
const sqlAlumno = "UPDATE alumnos SET password=? WHERE usuario=?"

db.query(sqlAlumno,[nuevaPassword,usuario],(err,result)=>{

if(result.affectedRows > 0){
return res.send("Contraseña actualizada correctamente")
}

// PAPAS
const sqlPapas = "UPDATE papas SET password=? WHERE usuario=?"

db.query(sqlPapas,[nuevaPassword,usuario],(err2,result2)=>{

if(result2.affectedRows > 0){
return res.send("Contraseña actualizada correctamente")
}

// MAESTROS / ADMIN
const sqlUsuarios = "UPDATE usuarios SET password=? WHERE correo=?"

db.query(sqlUsuarios,[nuevaPassword,usuario],(err3,result3)=>{

if(result3.affectedRows > 0){
return res.send("Contraseña actualizada correctamente")
}

res.send("Usuario no encontrado")

})

})

})

})

// =============================
// ENTREGAR TAREA
// =============================

app.post("/entregar-tarea", uploadTarea.single("archivo"), (req,res)=>{

const {tarea_id, alumno_id} = req.body

const archivo = req.file ? req.file.filename : null

if(!archivo){
return res.send("No se subió ningún archivo")
}

const sql = `
INSERT INTO entregas(tarea_id, alumno_id, archivo)
VALUES (?,?,?)
`

db.query(sql,[tarea_id, alumno_id, archivo],(err,result)=>{

if(err){
console.log(err)
res.send("Error al subir tarea")
}else{
res.send("Tarea entregada correctamente")
}

})

})

// =============================
// VER ENTREGAS
// =============================

app.get("/entregas",(req,res)=>{

const sql = `
SELECT entregas.id, alumnos.nombre, tareas.titulo, entregas.archivo, entregas.calificacion
FROM entregas
JOIN alumnos ON entregas.alumno_id = alumnos.id
JOIN tareas ON entregas.tarea_id = tareas.id
`

db.query(sql,(err,result)=>{

if(err){
console.log(err)
res.send("Error")
}else{
res.json(result)
}

})

})

// =============================
// CALIFICAR TAREA
// =============================

app.post("/calificar-tarea",(req,res)=>{

const {entrega_id, calificacion} = req.body

console.log("ID:", entrega_id)
console.log("Calificación:", calificacion)

const sql = `
UPDATE entregas
SET calificacion=?
WHERE id=?
`

db.query(sql,[calificacion, entrega_id],(err,result)=>{

if(err){
console.log(err)
return res.send("Error al calificar")
}

if(result.affectedRows === 0){
return res.send("No se encontró la entrega")
}

res.send("Tarea calificada correctamente")

})

})

// =============================
// SERVIDOR
// =============================




app.listen(3001, ()=>{

console.log("Servidor corriendo en puerto 3001")

})