### Context
Estas en un proyecto vacio. No tiene codigo.
Tu objetivo es crear el plan para implementar un campus estudiantil usando NextJS. No vamos a usar JavaScript puro, vamos a ir por TypeScript.

## Stack
Aparte de NextJS con TypeScript, vamos a usar como gestor de dependencias pnpm NO NPM. Cualquier referencia a NPM no se tolera en este proyecto usamos pnpm. La idea del proyecto es hostearlo luego en Vercel, y utilizar Supabase para que nos provea la base de datos. 
En el lint debes establecer reglas para NO permitir el tipo de valor "any". Cualquier any en el codigo debe ser considerado **error**. 
El frontend está armado en React utilizando TailwindCSS.

## Before start planning
Antes de continuar, tene las siguientes consideraciones:
- Utilizando la skill de find-skills, ubica skills necesarias para las tecnologias que vamos a usar. No planifiques la integracion sin antes encontrar skills relevantes y cargarlas. Dentro del ambiente actual ya contas con algunas pero pueden faltar otras.
- Contamos con un repositorio que ya implementa gran parte del frontend que vamos a necesitar: https://github.com/tomygiordev/plataforma-academica-spa
Este frontend debemos utilizarlo para la app. Solamente el frontend, el backend es propio y es lo que te voy a planificar aca. El frontend es de un companiero del trabajo, asi que podemos usarlo en su totalidad.

Una vez cumplas estas 2 especificaciones, pasemos a la siguiente parte que es armar el plan para el backend

### Backend
El campus contara con 3 funcionalidades core:
- Calendario por asignaturas
- Quiz por asignaturas
- Unidades con contenido por asignaturas

El frontend implementa la organización por años, por materia y un calendario, pero no implementa el quiz de asignaturas, el cual será necesario planificar.

## Calendario
Podemos estructurarlo de esta forma:
- Agenda
- Eventos
- Tipos de evento

Cada materia contara con una agenda propia. La agenda contiene eventos. Los eventos pertenecen tanto a una agenda como a un tipo de evento. Los tipos de evento pueden ser: Examen, Trabajo practico, Exposición. Este último tambien es una tabla y si bien contará con estos registros por ahora, pueden expandirse a más registros.

Los eventos pueden contener descripciones, así como un título. 
Las descripciones pueden tener hipervínculos, enlaces, formato etc. Por lo cual debe de apreciarse al armar la columna.
## Quiz
Pertenecen a una materia. Podemos armar los quiz como simples JSON que se traen desde el backend en algún lugar almacenados para armar los test.
La estructura del test deberia ser:
materia { unidad { tipo de pregunta; pregunta; respuestas; explicacion de la respuesta }}
De esta manera se pueden cargar multiples unidades por materia, con un set de varias preguntas por unidad, y el usuario puede elegir evaluarse por unidad, cantidad de preguntas, y podemos hacer distintos set de examenes como examenes por tiempo de N preguntas donde al terminar se evalua el rendimiento del alumno, examenes de prueba donde tras cada respuesta se le valida si respondio bien al usuario o no. Asi como un test general que abarque todas las unidades o un set de unidades, de forma personalizada.

La seccion de quiz estara disponible en el index de una materia en una seccion a parte.

## Unidades con contenido
Esta seccion vamos a simplificarla a como esta en el frontend. Unicamente vamos a poder guardar apuntes. 
Es decir, guardamos objetos que sean apunte X, que hagan referencia a un documento que se descargue y ya esta. Los pdfs los guardamos en una ruta relativa del servidor, pero las entradas de los apuntes los podemos guardar en la db. Tambien habilitar creacion de entradas de apuntes que no tengan pdfs, sino que contengan descripciones, donde puedan haber vinculos y demas. De esta forma se pueden anexar drives, docs, artifacts, etc.

## Usuarios
La página estará abierta a todo el publico, no habra un usuario como tal. Solamente habrán usuarios administradores que pueden cambiar el contenido de la página, accediendo como administrador del sistema. 
Este sistema debe estar bien protegido ante prompt injections y otros mecanismos de seguridad.