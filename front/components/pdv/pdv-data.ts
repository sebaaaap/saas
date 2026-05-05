import type { Category, Customer, PaymentMethod, Product } from "./pdv-types"

export const categories: Category[] = [
  { id: "all", name: "Todos", icon: "LayoutGrid", color: "bg-primary" },
  { id: "aceites", name: "Aceites y Lubricantes", icon: "Droplets", color: "bg-amber-600" },
  { id: "llantas", name: "Llantas y Neumaticos", icon: "CircleDot", color: "bg-zinc-700" },
  { id: "filtros", name: "Filtros", icon: "Filter", color: "bg-sky-600" },
  { id: "frenos", name: "Frenos", icon: "Disc3", color: "bg-red-600" },
  { id: "bujias", name: "Bujias y Encendido", icon: "Zap", color: "bg-yellow-500" },
  { id: "servicios", name: "Servicios", icon: "Wrench", color: "bg-emerald-600" },
]

export const products: Product[] = [
  // Aceites y Lubricantes
  { id: "p1", name: "Aceite Motor 5W-30 Sintetico 1L", price: 189.00, categoryId: "aceites", stock: 45, tax: 16, color: "bg-amber-50 border-amber-200", barcode: "7501000001001", unit: "lt" },
  { id: "p2", name: "Aceite Motor 10W-40 Semi-sintetico 1L", price: 145.00, categoryId: "aceites", stock: 60, tax: 16, color: "bg-amber-50 border-amber-200", barcode: "7501000001002", unit: "lt" },
  { id: "p3", name: "Aceite Motor 20W-50 Mineral 1L", price: 95.00, categoryId: "aceites", stock: 80, tax: 16, color: "bg-amber-50 border-amber-200", barcode: "7501000001003", unit: "lt" },
  { id: "p4", name: "Aceite Transmision ATF 1L", price: 165.00, categoryId: "aceites", stock: 30, tax: 16, color: "bg-orange-50 border-orange-200", barcode: "7501000001004", unit: "lt" },
  { id: "p5", name: "Liquido de Frenos DOT 4 500ml", price: 85.00, categoryId: "aceites", stock: 40, tax: 16, color: "bg-red-50 border-red-200", barcode: "7501000001005", unit: "pza" },
  { id: "p6", name: "Anticongelante 1L", price: 75.00, categoryId: "aceites", stock: 35, tax: 16, color: "bg-green-50 border-green-200", barcode: "7501000001006", unit: "lt" },

  // Llantas y Neumaticos
  { id: "p7", name: "Llanta 185/65 R15", price: 1250.00, categoryId: "llantas", stock: 16, tax: 16, color: "bg-zinc-50 border-zinc-300", barcode: "7501000002001", unit: "pza" },
  { id: "p8", name: "Llanta 205/55 R16", price: 1650.00, categoryId: "llantas", stock: 12, tax: 16, color: "bg-zinc-50 border-zinc-300", barcode: "7501000002002", unit: "pza" },
  { id: "p9", name: "Llanta 225/45 R17", price: 2100.00, categoryId: "llantas", stock: 8, tax: 16, color: "bg-zinc-50 border-zinc-300", barcode: "7501000002003", unit: "pza" },
  { id: "p10", name: "Llanta 245/70 R16 (Camioneta)", price: 2450.00, categoryId: "llantas", stock: 10, tax: 16, color: "bg-zinc-50 border-zinc-300", barcode: "7501000002004", unit: "pza" },
  { id: "p11", name: "Parche para Llanta", price: 35.00, categoryId: "llantas", stock: 200, tax: 16, color: "bg-slate-50 border-slate-200", barcode: "7501000002005", unit: "pza" },
  { id: "p12", name: "Valvula de Llanta", price: 25.00, categoryId: "llantas", stock: 150, tax: 16, color: "bg-slate-50 border-slate-200", barcode: "7501000002006", unit: "pza" },

  // Filtros
  { id: "p13", name: "Filtro de Aceite Universal", price: 85.00, categoryId: "filtros", stock: 50, tax: 16, color: "bg-sky-50 border-sky-200", barcode: "7501000003001", unit: "pza" },
  { id: "p14", name: "Filtro de Aire Motor", price: 120.00, categoryId: "filtros", stock: 35, tax: 16, color: "bg-sky-50 border-sky-200", barcode: "7501000003002", unit: "pza" },
  { id: "p15", name: "Filtro de Gasolina", price: 95.00, categoryId: "filtros", stock: 40, tax: 16, color: "bg-blue-50 border-blue-200", barcode: "7501000003003", unit: "pza" },
  { id: "p16", name: "Filtro de Cabina (A/C)", price: 150.00, categoryId: "filtros", stock: 25, tax: 16, color: "bg-cyan-50 border-cyan-200", barcode: "7501000003004", unit: "pza" },

  // Frenos
  { id: "p17", name: "Balatas Delanteras (Juego)", price: 450.00, categoryId: "frenos", stock: 20, tax: 16, color: "bg-red-50 border-red-200", barcode: "7501000004001", unit: "juego" },
  { id: "p18", name: "Balatas Traseras (Juego)", price: 380.00, categoryId: "frenos", stock: 18, tax: 16, color: "bg-red-50 border-red-200", barcode: "7501000004002", unit: "juego" },
  { id: "p19", name: "Disco de Freno Delantero", price: 650.00, categoryId: "frenos", stock: 14, tax: 16, color: "bg-rose-50 border-rose-200", barcode: "7501000004003", unit: "pza" },
  { id: "p20", name: "Disco de Freno Trasero", price: 580.00, categoryId: "frenos", stock: 12, tax: 16, color: "bg-rose-50 border-rose-200", barcode: "7501000004004", unit: "pza" },

  // Bujias y Encendido
  { id: "p21", name: "Bujia de Encendido (c/u)", price: 65.00, categoryId: "bujias", stock: 100, tax: 16, color: "bg-yellow-50 border-yellow-200", barcode: "7501000005001", unit: "pza" },
  { id: "p22", name: "Cable de Bujia (Juego 4)", price: 320.00, categoryId: "bujias", stock: 15, tax: 16, color: "bg-yellow-50 border-yellow-200", barcode: "7501000005002", unit: "juego" },
  { id: "p23", name: "Bobina de Encendido", price: 480.00, categoryId: "bujias", stock: 10, tax: 16, color: "bg-amber-50 border-amber-200", barcode: "7501000005003", unit: "pza" },

  // Servicios
  { id: "p24", name: "Cambio de Aceite", price: 250.00, categoryId: "servicios", stock: 999, tax: 16, color: "bg-emerald-50 border-emerald-200", barcode: "SRV001", unit: "servicio" },
  { id: "p25", name: "Alineacion y Balanceo", price: 450.00, categoryId: "servicios", stock: 999, tax: 16, color: "bg-emerald-50 border-emerald-200", barcode: "SRV002", unit: "servicio" },
  { id: "p26", name: "Vulcanizado de Llanta", price: 120.00, categoryId: "servicios", stock: 999, tax: 16, color: "bg-teal-50 border-teal-200", barcode: "SRV003", unit: "servicio" },
  { id: "p27", name: "Montaje de Llanta", price: 80.00, categoryId: "servicios", stock: 999, tax: 16, color: "bg-teal-50 border-teal-200", barcode: "SRV004", unit: "servicio" },
  { id: "p28", name: "Cambio de Balatas (Servicio)", price: 350.00, categoryId: "servicios", stock: 999, tax: 16, color: "bg-green-50 border-green-200", barcode: "SRV005", unit: "servicio" },
  { id: "p29", name: "Revision General / Diagnostico", price: 300.00, categoryId: "servicios", stock: 999, tax: 16, color: "bg-green-50 border-green-200", barcode: "SRV006", unit: "servicio" },
  { id: "p30", name: "Cambio de Filtro de Aire", price: 150.00, categoryId: "servicios", stock: 999, tax: 16, color: "bg-lime-50 border-lime-200", barcode: "SRV007", unit: "servicio" },
]

export const customers: Customer[] = [
  { id: "c1", name: "Publico en General", phone: "", rfc: "XAXX010101000" },
  { id: "c2", name: "Juan Hernandez", phone: "555-1234-567", email: "juan@email.com", rfc: "HEJM900101ABC", vehicle: "Ford F-150 2020" },
  { id: "c3", name: "Maria Lopez Rodriguez", phone: "555-9876-543", email: "maria@email.com", rfc: "LORM850515XYZ", vehicle: "Nissan Sentra 2019" },
  { id: "c4", name: "Carlos Perez Gomez", phone: "555-4567-890", email: "carlos@email.com", rfc: "PEGC920320DEF", vehicle: "Chevrolet Aveo 2021" },
  { id: "c5", name: "Transportes del Norte SA", phone: "555-1111-222", email: "contacto@transnorte.com", rfc: "TNO100520QR3", vehicle: "Flotilla (12 unidades)" },
]

export const paymentMethods: PaymentMethod[] = [
  { id: "pm1", name: "Efectivo", icon: "Banknote", type: "cash" },
  { id: "pm2", name: "Tarjeta", icon: "CreditCard", type: "card" },
  { id: "pm3", name: "Transferencia", icon: "ArrowLeftRight", type: "transfer" },
]
