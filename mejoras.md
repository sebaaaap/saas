Actúa como Senior Systems Architect.

tereas a realizar por modulos: 

pdv: 

metodos de pago:

tenemos que crear una especie de “mantenedor” de metodos de pago, ya que cada taller aparte de manejar transferencie, tarjeta, efectivo. Algunos tiene “credito interno” que es un credito interno que ellos manejar por cliente. entonces para no hacer un sistema rijido y borrar un metodo lo mejor seria seria crear una especie de mantenedor, con las tipicicas ya cargadas por defecto(transferencie, tarjeta, efectivo) y obvio dar lamopcion de crear las propias. esto quiero que se maneje del modulo de configuracion, en donde se crean las cajas, usuarios y esas cosas.

creacion de auto/cliente

actualmente la creacion del vehiculo o cliente se hace en el punto de venta o en el modulo de clientes. especifiamnete queremos acelerar esa creacion desde el punto de vent. ahora queremos anotar en primer lugar la patente del vehiculo, que vaya por defecto con el emoji de auto, pero que tenga la opcion de guardarlo como moto/camion, etc. seria la patente-nombre del cliente- y algun contacto numero o correo, esas 3 cosas bastarian para asociar un vehiculo y crear un cleinte al mismo tiempo, obvimanete dps en el modulo cliente se puden completar el resto de las caracteristicas como el modleo del auto o mas info de cleinte, pero a nivel de punto de venta queremos que sea asi, patente, nombre del cleinte y numero o correo, con eso ya seria suficiente pra llevar un registro en nuestra bdd de clientes.

historial del auto:

si bien tenemos el historial de las compras de los cleintes, ahora queremos traer el historial de las patentes o del cliente, queremos que asi como se traen el historail de las ot, traer un resumen de que fue lo que realizo en las ultimas 5 visitas o compras, asi por patente van filtrando. ese “5” me gustaria que fuese dinamico a lo mjr en un taller me van a pedir mas o menos. de igual manera eso se puede ver el historial completo en la parte de modulo clientes y filtrar, pero no lo tenemos a mano en el punto de venta, eso me gustaria como un botin arriba cercano a la orden como las ot para ver el historial.

Nueva funcionalidad punto de venta

poder realizar compras o gastos rapidos: por ejemplo el dar propinas, comprar algo que salio al momento de un provedor x ramdom. seria bueno en el punto de venta activar un boton un switch que sea “activar modo compra” que cambien los colores por ejemplo o quitar los productos a la venta. o no se para que realmente que se de cuenta que activo algo. en ese modo los gastos que se hagan seran por categorias, “propina”-”abono”-”comida”, etc la creacion de ellas podran ser dinamicas de ese panel y tambien podran ser creadas desde el modulo configuraciones. el metodo de pago, con el que nostros pagaremos ese gasto debera ser con efectivo-transferencia-tarjeta, y se debera descontar a las cuentas correspondiente de las ventas segun que metodo se elijio, para llevar la trazabilidad y que no hayan problemas de cuadraje. Ademas de poder dejar una glosa o comentario para tener mas contexto

Inventario: 

migracion o iserccion de varios datos al inventario;

la migracion de los datos el exel que pasaran vendra con cierto formato que ya estmaos manejando ese formato, pasa que en la seccion de categoria queremos hacerlo desde el exel y seria bueno hacerlo con el tema de las ubicaciones por ejemplo si viene con cetagorioa “filtros” se crea la cetgoria filtros con cierto color como lo hace ahora, pero si viene “filtros/fdeargentina” no se debe crear “filtros” porque ya se creo precviemnte o es un padre se entiende? y si viene asi “iltros/fdeargentina/a1” hay un padre un sub padre y asi, cada uno con respectivo color. y lo mismo para el tema de los pasillos. esto para ahorrar tiempo en la migracion de datos, para que el sistema empieze a operar lo mas rapido posible.

stock minimo y notifiacion

en la creacion de productos en ese panel donde se crea e igual si se migra, quiero colocar un stock minimo que sea editable en el tiempo, debe ser por producto. Y por ejemplo si es 5, teniamos 6, y en el ounto de venta vendi 2, osea me quede con 4. alli debe saltarme una alarma/notificacion o que la card del producto empieze a parpadear o una voz sonifo que avse que quede poco, para estar pendiente o crear un orden de compra…

Transeferenica de productos entre SUCURSALES

esto es nuevo, es un feat nuevo total. ya tenemos la transferencia de productos entre ubicaciones diferentes. Ahora debemos hacerlo a nivel de sucursales.

New:

Sucursales. el sistema necesita soportar la creacion de sucursales en donde cada una tenga este sistema que manejamos. actualmente el sistema que existe todo este ecosistema es potente y muy bueno pero es a nivel 1:1 un taller:una sucursal pero que pasa si tiene N sucursales. Necesitamos saber que se vende en cada sucursal, y claro fisicamente las sucursales manejan un inventario unico, peor la tiena/marca/taller maneja un inventario un historial de ventas compras consolidado entre las sucursales, se entiende? tenemos que crear ese nivel de abstraccion. por defecto el sistema funcionara asi como lo tenemos ahora, sucursal 1 o principal. peor si quiere agregar un sucursal nueva? debe ser posible que la cree del modulo de configuracion alli donde se crean los users y cajas. a nivel de bdd sera como poner el id o identificador de la sucursal y estaria no? pero a nivel ux no cambia mucho solo se debera seleccionar la sucursal, asi como cuando se seleccion la caja en el punto de venta.